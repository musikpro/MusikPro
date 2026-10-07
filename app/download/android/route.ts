import { NextResponse } from "next/server";
import { openPublishedRelease, countDownload } from "@/lib/app-releases/server";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DOWNLOADS_PER_MINUTE = 6;

const HEADERS = {
  "Content-Type": "application/vnd.android.package-archive",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "Content-Security-Policy": "default-src 'none'; sandbox",
} as const;

function failure(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Télécharge l'APK de la version publiée de l'application Android. Route publique (n'importe quel visiteur du site),
 * mais : débit limité par adresse IP, fichier lu depuis un stockage privé (jamais d'URL de stockage exposée), servi
 * en « attachment » avec `nosniff`, jamais interprété. Aucun chemin ni nom de fichier ne vient du visiteur.
 */
async function serve(request: Request, withBody: boolean) {
  const limit = await rateLimit(`download:android:${clientIp(request)}`, DOWNLOADS_PER_MINUTE);
  if (limit.backend === "unavailable") return failure("Le téléchargement est momentanément indisponible.", 503);
  if (!limit.success) return failure("Trop de téléchargements. Réessaie dans une minute.", 429);

  let opened;
  try {
    opened = await openPublishedRelease("android");
  } catch {
    return failure("Le téléchargement est momentanément indisponible.", 503);
  }
  if (!opened) return failure("Aucune version de l'application n'est disponible pour le moment.", 404);

  const { release, stream, size } = opened;
  const headers = {
    ...HEADERS,
    "Content-Disposition": `attachment; filename="${release.fileName}"`,
    "Content-Length": String(size),
    "X-Checksum-Sha256": release.sha256,
  };
  if (!withBody) {
    void stream.cancel();
    return new Response(null, { status: 200, headers });
  }
  await countDownload(release.id);
  return new Response(stream, { status: 200, headers });
}

export async function GET(request: Request) {
  return serve(request, true);
}

export async function HEAD(request: Request) {
  return serve(request, false);
}
