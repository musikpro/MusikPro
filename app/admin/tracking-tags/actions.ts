"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { actionErrorMessage } from "@/lib/admin/action-state";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { hasAppRole } from "@/lib/auth/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { deleteTrackingTag, saveTrackingTag, TRACKING_TAGS_CACHE_TAG } from "@/lib/tracking-tags/server";
import { trackingTagFormSchema, trackingTagIdSchema } from "@/lib/validation/tracking-tags";

async function requireSuperAdmin() {
  const session = await requireAdmin();
  if (!hasAppRole((session.user as { role?: string }).role, "admin")) {
    throw new Error("Seul un Super Admin peut gérer les balises de suivi.");
  }
  return session;
}

function refresh() {
  // Le cache des balises est vidé tout de suite : la landing page et le tableau de bord les relisent à la prochaine visite.
  revalidateTag(TRACKING_TAGS_CACHE_TAG, { expire: 0 });
  revalidatePath("/admin/tracking-tags");
}

/** Crée ou modifie une balise (le code est analysé et refusé s'il contient autre chose que meta/link/script/noscript). */
export async function saveTrackingTagAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireSuperAdmin();
    const parsed = trackingTagFormSchema.parse({
      id: formData.get("id") ? String(formData.get("id")) : undefined,
      name: String(formData.get("name") ?? ""),
      code: String(formData.get("code") ?? ""),
      placement: String(formData.get("placement") ?? ""),
      enabled: formData.get("enabled") ? String(formData.get("enabled")) : undefined,
    });
    const { id, created } = await saveTrackingTag({ ...parsed, actorId: session.user.id });
    await writeAuditLog({
      action: created ? "tracking_tag.created" : "tracking_tag.updated",
      actorId: session.user.id,
      targetType: "tracking_tags",
      targetId: id,
      metadata: { name: parsed.name, placement: parsed.placement, enabled: parsed.enabled },
    });
    refresh();
    return {
      ok: true,
      message: created ? `Balise « ${parsed.name} » ajoutée.` : `Balise « ${parsed.name} » enregistrée.`,
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d'enregistrer la balise.") };
  }
}

export async function deleteTrackingTagAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireSuperAdmin();
    const { id } = trackingTagIdSchema.parse({ id: String(formData.get("id") ?? "") });
    const removed = await deleteTrackingTag(id);
    if (!removed) return { ok: false, message: "Balise introuvable (déjà supprimée ?)." };
    await writeAuditLog({
      action: "tracking_tag.deleted",
      actorId: session.user.id,
      targetType: "tracking_tags",
      targetId: id,
      metadata: { name: removed.name },
    });
    refresh();
    return { ok: true, message: `Balise « ${removed.name} » supprimée.` };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer la balise.") };
  }
}
