import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/permissions";
import { resolveExtraAdminSlugs } from "@/lib/auth/custom-roles";
import { deleteCloudinaryImage, isCloudinaryConfigured, uploadImageToCloudinary } from "@/lib/storage/cloudinary";
import { MEDIA_LIBRARY_FOLDER } from "@/lib/media/admin";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { getSecurityLevel, securityPolicy } from "@/lib/security/config";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

const uploadFormSchema = z.object({ file: z.instanceof(File) });

/**
 * A real HTTP endpoint (not a Server Action) so the admin Médias page (components/admin/
 * AdminMediaUploadForm.tsx) can drive it with XMLHttpRequest and get real byte-level upload
 * progress via xhr.upload.onprogress — a Server Action's internal RPC transport doesn't expose
 * that. Mirrors app/api/uploads/images/route.ts's guards/shape, scoped to admins and the shared
 * media-library folder instead of a per-user one.
 */
export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  // 10 MiB image limit (see MAX_IMAGE_BYTES in lib/storage/cloudinary.ts) + bounded multipart overhead.
  const sizeFailure = rejectOversizedRequest(request, 11 * 1024 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "multipart/form-data");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!isAdminRole(role, await resolveExtraAdminSlugs(role)))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const ip = clientIp(request);
  const level = getSecurityLevel();
  const limit = await rateLimit(
    `admin:media-upload:${session.user.id}:${ip}`,
    Math.max(5, Math.floor(securityPolicy[level].apiPerMinute / 2)),
  );
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Security rate-limit backend unavailable" }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  if (!isCloudinaryConfigured())
    return NextResponse.json({ error: "L'envoi d'image n'est pas disponible pour le moment." }, { status: 503 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Impossible de lire le fichier envoyé." }, { status: 400 });
  }
  const parsed = uploadFormSchema.safeParse({ file: form.get("file") });
  if (!parsed.success) return NextResponse.json({ error: "Un fichier image est requis." }, { status: 400 });

  try {
    const uploaded = await uploadImageToCloudinary(parsed.data.file, { folder: MEDIA_LIBRARY_FOLDER });
    // The médiathèque only ever holds AVIF: the upload is converted on Cloudinary's side (f_avif), and
    // anything that did not come out as AVIF is removed rather than kept in another format.
    if (uploaded.format !== "avif") {
      await deleteCloudinaryImage(uploaded.publicId).catch(() => undefined);
      return NextResponse.json({ error: "La conversion en AVIF a échoué pour cette image." }, { status: 422 });
    }
    await writeAuditLog({
      action: "media_asset.uploaded",
      actorId: session.user.id,
      targetType: "media_asset",
      targetId: uploaded.publicId,
      metadata: { bytes: uploaded.bytes, width: uploaded.width, height: uploaded.height },
    });
    revalidatePath("/admin/media");
    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "L'envoi de l'image a échoué.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
