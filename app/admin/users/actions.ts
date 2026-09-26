"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { count, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { user, customRoles } from "@/db/schema";
import {
  ADMIN_ROLES,
  hasAppRole,
  wouldRemoveLastSuperAdmin,
  wouldSelfDemoteToUser,
  type AppRole,
} from "@/lib/auth/permissions";

const roleSchema = z.object({
  userId: z.string().min(1).max(120),
  role: z.string().min(1).max(140), // rôle système ("user", "admin", ...) ou "custom:<id>"
});
export async function setRole(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const adminSession = await requireAdmin();
    // better-auth's own admin plugin only grants the "set-role" permission to the literal "admin"
    // role (its permission model is separate from ADMIN_ROLES/isAdminRole) — enforce the same rule
    // explicitly here so the 4 other admin roles get a clear French message instead of an opaque
    // FORBIDDEN error from auth.api.setRole below.
    if (!hasAppRole((adminSession.user as { role?: string }).role, "admin"))
      throw new Error("Seul un Super Admin peut modifier les rôles.");
    const parsed = roleSchema.parse(Object.fromEntries(formData));
    const knownSystemRoles: string[] = ["user", ...ADMIN_ROLES];
    const isCustomRole = parsed.role.startsWith("custom:");
    if (!knownSystemRoles.includes(parsed.role) && !isCustomRole) throw new Error("Rôle invalide.");
    if (isCustomRole) {
      const customRoleId = parsed.role.slice("custom:".length);
      const [existing] = await getServiceDb()
        .select({ id: customRoles.id })
        .from(customRoles)
        .where(eq(customRoles.id, customRoleId))
        .limit(1);
      if (!existing) throw new Error("Ce rôle personnalisé n’existe plus.");
    }
    // wouldSelfDemoteToUser/wouldRemoveLastSuperAdmin only ever compare nextRole against the
    // literals "user"/"admin" — a custom role slug is just "some other string" to their logic, so
    // this assertion is safe even though a custom role isn't a member of the AppRole union.
    const nextRole = parsed.role as AppRole;
    if (wouldSelfDemoteToUser(adminSession.user.id, parsed.userId, nextRole))
      throw new Error("Vous ne pouvez pas retirer votre propre accès admin depuis cet écran.");
    const [target] = await getServiceDb()
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, parsed.userId))
      .limit(1);
    if (target?.role === "admin") {
      const [{ value: superAdminCount }] = await getServiceDb()
        .select({ value: count() })
        .from(user)
        .where(eq(user.role, "admin"));
      if (wouldRemoveLastSuperAdmin(Number(superAdminCount), target.role, nextRole))
        throw new Error("Impossible de retirer le dernier compte Super Admin.");
    }
    // better-auth's admin plugin types setRole's role as "user" | "admin" regardless of the
    // adminRoles config (its InferAdminRolesFromOption only reads a roles/access-control option we
    // don't use) — the DB column is free-text and the plugin writes the string as-is at runtime.
    await auth.api.setRole({ body: parsed as { userId: string; role: "user" | "admin" }, headers: await headers() });
    await writeAuditLog({
      action: "user.role.changed",
      actorId: adminSession.user.id,
      targetType: "user",
      targetId: parsed.userId,
      metadata: { role: parsed.role },
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin/roles");
    return { ok: true, message: "Rôle de l'utilisateur mis à jour." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier le rôle de cet utilisateur.") };
  }
}

const deleteUserSchema = z.object({ userId: z.string().min(1).max(120) });
export async function deleteUser(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const adminSession = await requireAdmin();
    // Same reasoning as setRole above: better-auth's "remove-user" permission is also literal
    // "admin"-only.
    if (!hasAppRole((adminSession.user as { role?: string }).role, "admin"))
      throw new Error("Seul un Super Admin peut supprimer un compte.");
    const parsed = deleteUserSchema.parse(Object.fromEntries(formData));
    if (parsed.userId === adminSession.user.id)
      throw new Error("Vous ne pouvez pas supprimer votre propre compte depuis cet écran.");
    await auth.api.removeUser({ body: parsed, headers: await headers() });
    await writeAuditLog({
      action: "user.deleted",
      actorId: adminSession.user.id,
      targetType: "user",
      targetId: parsed.userId,
    });
    revalidatePath("/admin/users");
    return { ok: true, message: "Compte utilisateur supprimé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer ce compte utilisateur.") };
  }
}
