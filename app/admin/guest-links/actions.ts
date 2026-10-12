"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { withAdminNotice } from "@/lib/admin/notice-redirect";
import { requireAdmin } from "@/lib/auth/session";
import { createGuestLink, setGuestLinkActive, trashGuestLink, updateGuestLink } from "@/lib/guest-links/server";
import { writeAuditLog } from "@/lib/security/audit";
import { guestLinkFormSchema, guestLinkIdSchema } from "@/lib/validation/guest-links";

const toggleSchema = guestLinkIdSchema.extend({ active: z.enum(["true", "false"]) });

function revalidateGuestLinks() {
  revalidatePath("/admin/guest-links");
  revalidatePath("/admin/corbeille");
}

export async function createGuestLinkAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const parsed = guestLinkFormSchema.parse(Object.fromEntries(formData));
    const created = await createGuestLink(parsed, session.user.id);
    await writeAuditLog({
      action: "guest_link.created",
      actorId: session.user.id,
      targetType: "guest_link",
      targetId: created.id,
      metadata: { slug: created.slug, destination: created.destination },
    });
    revalidateGuestLinks();
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de créer ce lien.") };
  }
  redirect(withAdminNotice("/admin/guest-links", "Lien invité créé."));
}

export async function updateGuestLinkAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = guestLinkFormSchema.extend({ id: guestLinkIdSchema.shape.id }).parse(Object.fromEntries(formData));
    const { id, ...values } = parsed;
    const updated = await updateGuestLink(id, values);
    if (!updated) return { ok: false, message: "Ce lien n’existe plus ou est dans la corbeille." };
    await writeAuditLog({
      action: "guest_link.updated",
      actorId: session.user.id,
      targetType: "guest_link",
      targetId: id,
      metadata: { slug: updated.slug, destination: updated.destination, active: updated.active },
    });
    revalidateGuestLinks();
    return { ok: true, message: "Lien invité enregistré." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer ce lien.") };
  }
}

/** Active ou désactive un lien (le champ `active` reçu est l'état actuel, comme pour les codes promo). */
export async function toggleGuestLinkAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = toggleSchema.parse(Object.fromEntries(formData));
    const active = parsed.active !== "true";
    if (!(await setGuestLinkActive(parsed.id, active)))
      return { ok: false, message: "Ce lien n’existe plus ou est dans la corbeille." };
    await writeAuditLog({
      action: "guest_link.active.changed",
      actorId: session.user.id,
      targetType: "guest_link",
      targetId: parsed.id,
      metadata: { active },
    });
    revalidateGuestLinks();
    return { ok: true, message: active ? "Lien activé." : "Lien désactivé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier ce lien.") };
  }
}

/** « Supprimer » = mise en corbeille (le lien cesse de fonctionner, restaurable) ; jamais de suppression définitive ici. */
export async function trashGuestLinkAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = guestLinkIdSchema.parse(Object.fromEntries(formData));
    const trashed = await trashGuestLink(parsed.id, session.user.id);
    if (!trashed) return { ok: false, message: "Ce lien n’existe plus ou est déjà dans la corbeille." };
    await writeAuditLog({
      action: "guest_link.trashed",
      actorId: session.user.id,
      targetType: "guest_link",
      targetId: parsed.id,
      metadata: { slug: trashed.slug },
    });
    revalidateGuestLinks();
    return { ok: true, message: "Lien déplacé dans la corbeille." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer ce lien.") };
  }
}
