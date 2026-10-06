import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { findOwnedCompletedAudio } from "@/lib/ai/song-download";
import { attachmentDisposition, extensionForContentType } from "@/lib/songs/audio-file";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Garde-fous sur la requête sortante : un MP3 de chanson fait quelques Mo, jamais des centaines. */
const UPSTREAM_TIMEOUT_MS = 45_000;
const MAX_BYTES = 100 * 1024 * 1024;
const DOWNLOADS_PER_MINUTE = 20;

const querySchema = z.object({
  url: z
    .string()
    .url()
    .max(2048)
    .refine((value) => value.startsWith("https://"), "https obligatoire"),
  name: z.string().max(200).optional(),
});

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

function failure(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

/**
 * Relaie le fichier audio d'une chanson de l'utilisateur avec `Content-Disposition: attachment`.
 *
 * Pourquoi : dans l'application Android (WebView), un lien `blob:` avec l'attribut `download` n'enregistre rien. Le
 * `DownloadListener` natif de `MainActivity` prend le relais dès qu'une réponse « attachment » de ce domaine arrive.
 * Dans l'application iPhone, le site lit ce même flux (même origine) pour le remettre à la feuille de partage iOS.
 * Ce n'est pas un proxy ouvert : l'URL doit exister dans `music_generation_jobs` pour le compte connecté.
 */
async function authorize(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return { response: failure("Authentification requise.", 401) } as const;

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return { response: failure("Paramètres invalides.", 400) } as const;

  const limit = await rateLimit(`songs:download:${session.user.id}:${clientIp(request)}`, DOWNLOADS_PER_MINUTE);
  if (limit.backend === "unavailable") return { response: failure("Le contrôle de débit est indisponible.", 503) } as const;
  if (!limit.success) return { response: failure("Trop de requêtes. Réessaie dans un instant.", 429) } as const;

  const song = await findOwnedCompletedAudio(session.user.id, parsed.data.url);
  if (!song) return { response: failure("Chanson introuvable.", 404) } as const;

  return { url: parsed.data.url, name: parsed.data.name?.trim() || song.title } as const;
}

/** Vérifie seulement l'accès (sans télécharger) : le site s'en sert avant de lancer le téléchargement natif. */
export async function HEAD(request: Request): Promise<Response> {
  const result = await authorize(request);
  if (result.response) return result.response;
  return new Response(null, { status: 200, headers: NO_STORE });
}

export async function GET(request: Request): Promise<Response> {
  const result = await authorize(request);
  if (result.response) return result.response;

  let upstream: Response;
  try {
    upstream = await fetch(result.url, {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return failure("Le fichier est momentanément indisponible.", 502);
  }
  if (!upstream.ok || !upstream.body) return failure("Le fichier est momentanément indisponible.", 502);

  const declaredLength = Number(upstream.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BYTES) {
    await upstream.body.cancel();
    return failure("Le fichier est trop volumineux.", 502);
  }

  const upstreamType = upstream.headers.get("content-type") ?? "";
  const contentType = /^(audio\/|video\/mp4)/i.test(upstreamType) ? upstreamType : "audio/mpeg";
  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": attachmentDisposition(result.name, extensionForContentType(contentType)),
    "X-Content-Type-Options": "nosniff",
    ...NO_STORE,
  });
  // Content-Length seulement si la source n'est pas compressée (sinon la taille annoncée ne serait pas celle envoyée).
  if (declaredLength > 0 && !upstream.headers.get("content-encoding")) headers.set("Content-Length", String(declaredLength));
  return new Response(upstream.body.pipeThrough(capBytes(MAX_BYTES)), { status: 200, headers });
}

/** Coupe le flux au-delà de `limit` octets, même si la source n'annonce pas (ou falsifie) sa taille. */
function capBytes(limit: number) {
  let total = 0;
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      total += chunk.byteLength;
      if (total > limit) controller.error(new Error("size_limit"));
      else controller.enqueue(chunk);
    },
  });
}
