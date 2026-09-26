"use server";

import { randomUUID } from "node:crypto";
import { eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { customRoles, user } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { hasAppRole, canDeleteCustomRole } from "@/lib/auth/permissions";
import { readCustomRoleForm } from "@/lib/validation/custom-roles";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { withAdminNotice } from "@/lib/admin/notice-redirect";
import { writeAuditLog } from "@/lib/security/audit";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

function requireSuperAdmin(role: string | null | undefined) {
  if (!hasAppRole(role, "admin")) throw new Error("Seul un Super Admin peut gérer les rôles personnalisés.");
}

export async function createCustomRole(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    requireSuperAdmin((session.user as { role?: string }).role);
    const parsed = readCustomRoleForm(formData);
    const id = randomUUID();
    await getServiceDb().insert(customRoles).values({ id, ...parsed });
    await writeAuditLog({
      action: "role.custom.created",
      actorId: session.user.id,
      targetType: "custom_role",
      targetId: id,
      metadata: { name: parsed.name },
    });
    revalidatePath("/admin/roles");
    revalidatePath("/admin/users");
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de créer ce rôle.") };
  }
  redirect(withAdminNotice("/admin/roles", "Rôle créé."));
}

export async function updateCustomRole(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    requireSuperAdmin((session.user as { role?: string }).role);
    const id = z.string().trim().min(1).max(120).parse(formData.get("id"));
    const parsed = readCustomRoleForm(formData);
    // defaultNow() only applies on INSERT; existing convention (app/admin/coupons/actions.ts,
    // app/admin/ai-providers/actions.ts, ...) is to pass updatedAt explicitly on every UPDATE.
    await getServiceDb()
      .update(customRoles)
      .set({ ...parsed, updatedAt: new Date() })
      .where(eq(customRoles.id, id));
    await writeAuditLog({
      action: "role.custom.updated",
      actorId: session.user.id,
      targetType: "custom_role",
      targetId: id,
      metadata: { name: parsed.name },
    });
    revalidatePath("/admin/roles");
    revalidatePath(`/admin/roles/${id}/edit`);
    revalidatePath("/admin/users");
    return { ok: true, message: "Rôle mis à jour." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer ce rôle.") };
  }
}

export async function deleteCustomRole(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    requireSuperAdmin((session.user as { role?: string }).role);
    const id = z.string().trim().min(1).max(120).parse(formData.get("id"));
    const slug = `custom:${id}`;
    const [{ value: memberCount }] = await getServiceDb()
      .select({ value: count() })
      .from(user)
      .where(eq(user.role, slug));
    if (!canDeleteCustomRole(Number(memberCount)))
      throw new Error(`Réassignez d’abord les ${memberCount} membre(s) de ce rôle avant de le supprimer.`);
    await getServiceDb().delete(customRoles).where(eq(customRoles.id, id));
    await writeAuditLog({
      action: "role.custom.deleted",
      actorId: session.user.id,
      targetType: "custom_role",
      targetId: id,
    });
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer ce rôle.") };
  }
  redirect(withAdminNotice("/admin/roles", "Rôle supprimé."));
}
