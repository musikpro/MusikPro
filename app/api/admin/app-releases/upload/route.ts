import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/permissions";
import { resolveExtraAdminSlugs } from "@/lib/auth/custom-roles";
import { APK_CONTENT_TYPES, ANDROID_BLOB_PREFIX, MAX_APK_BYTES } from "@/lib/app-releases/constants";
import { isBlobConfigured } from "@/lib/app-releases/server";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";

export const runtime = "nodejs";

/**
 * Forme du corps envoyé par `upload()` du navigateur pour obtenir un jeton d'envoi. Strict sur ce qui nous intéresse ;
 * le contenu précis du jeton est ensuite contrôlé par `handleUpload` du SDK.
 */
const uploadRequestSchema = z
  .object({
    type: z.literal("blob.generate-client-token"),
    payload: z.object({ pathname: z.string().max(300) }).passthrough(),
  })
  .passthrough();

const UPLOAD_PATHNAME = new RegExp(`^${ANDROID_BLOB_PREFIX.replaceAll("/", "\\/")}[A-Za-z0-9._-]{1,120}\\.apk$`);

/**
 * Délivre un jeton d'envoi à usage limité (dossier, taille et types fixés par le serveur) pour que le navigateur de
 * l'administrateur envoie directement l'APK vers le stockage privé (les fonctions Vercel sont limitées à 4,5 Mo).
 * Réservé aux comptes d'administration ; le fichier n'est ni publié ni servi avant d'avoir été vérifié et publié.
 */
export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 16 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!isAdminRole(role, await resolveExtraAdminSlugs(role)))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const limit = await rateLimit(`admin:app-release-upload:${session.user.id}:${clientIp(request)}`, 20);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  if (!isBlobConfigured())
    return NextResponse.json({ error: "Le stockage des fichiers n'est pas encore configuré." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success || !UPLOAD_PATHNAME.test(parsed.data.payload.pathname))
    return NextResponse.json({ error: "Demande d'envoi invalide." }, { status: 400 });

  try {
    const result = await handleUpload({
      request,
      body: body as HandleUploadBody,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: APK_CONTENT_TYPES,
        maximumSizeInBytes: MAX_APK_BYTES,
        addRandomSuffix: true,
        allowOverwrite: false,
        validUntil: Date.now() + 15 * 60 * 1000,
      }),
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Impossible de préparer l'envoi." }, { status: 400 });
  }
}
