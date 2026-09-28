"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { deleteCloudinaryImage } from "@/lib/storage/cloudinary";
import { writeAuditLog } from "@/lib/security/audit";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { MEDIA_LIBRARY_FOLDER } from "@/lib/media/admin";

// Uploading is handled by app/api/admin/media/upload/route.ts instead of a Server Action here —
// a real HTTP endpoint lets components/admin/AdminMediaUploadForm.tsx drive it with
// XMLHttpRequest for real byte-level progress, which a Server Action's RPC transport can't expose.
const deleteSchema = z.object({ publicId: z.string().trim().min(1).max(300) });

export async function deleteMediaAsset(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { publicId } = deleteSchema.parse(Object.fromEntries(formData));
    if (!publicId.startsWith(`${MEDIA_LIBRARY_FOLDER}/`)) throw new Error("Image hors de la médiathèque.");
    await deleteCloudinaryImage(publicId);
    await writeAuditLog({
      action: "media_asset.deleted",
      actorId: session.user.id,
      targetType: "media_asset",
      targetId: publicId,
    });
    revalidatePath("/admin/media");
    return { ok: true, message: "Image supprimée de la médiathèque." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer cette image.") };
  }
}
