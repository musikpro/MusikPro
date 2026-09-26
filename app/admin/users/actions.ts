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
import { user } from "@/db/schema";
import { wouldRemoveLastSuperAdmin, wouldSelfDemoteToUser } from "@/lib/auth/permissions";

const roleSchema = z.object({
  userId: z.string().min(1).max(120),
  role: z.enum(["user", "admin", "admin_content", "admin_payments", "support", "moderator"]),
});
export async function setRole(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const adminSession = await requireAdmin();
    const parsed = roleSchema.parse(Object.fromEntries(formData));
    if (wouldSelfDemoteToUser(adminSession.user.id, parsed.userId, parsed.role))
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
      if (wouldRemoveLastSuperAdmin(Number(superAdminCount), target.role, parsed.role))
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
