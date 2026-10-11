"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { requireAdmin } from "@/lib/auth/session";
import { hasAppRole } from "@/lib/auth/permissions";
import { writeAuditLog } from "@/lib/security/audit";
import { purgeTrashedSong, restoreTrashedSong } from "@/lib/trash/songs";
import { purgeTrashedUser, restoreTrashedUser } from "@/lib/trash/users";

const songKeySchema = z.object({ songKey: z.string().trim().min(1).max(160) });
const userIdSchema = z.object({ userId: z.string().trim().min(1).max(120) });

function refresh() {
  revalidatePath("/admin/corbeille");
  revalidatePath("/admin/generations");
  revalidatePath("/admin/users");
  revalidatePath("/admin/library");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/");
}

/** Seul un Super Admin gère la corbeille des comptes (comme la suppression de compte avant elle). */
async function requireSuperAdmin() {
  const session = await requireAdmin();
  if (!hasAppRole((session.user as { role?: string }).role, "admin"))
    throw new Error("Seul un Super Admin peut gérer la corbeille des comptes.");
  return session;
}

export async function restoreSong(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { songKey } = songKeySchema.parse(Object.fromEntries(formData));
    const restored = await restoreTrashedSong(songKey);
    if (!restored) return { ok: false, message: "Cette chanson n’est plus dans la corbeille." };
    await writeAuditLog({
      action: "song.restored",
      actorId: session.user.id,
      targetType: "song_group",
      targetId: songKey,
    });
    refresh();
    return { ok: true, message: "Chanson restaurée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de restaurer cette chanson.") };
  }
}

export async function purgeSong(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { songKey } = songKeySchema.parse(Object.fromEntries(formData));
    if (!(await purgeTrashedSong(songKey)))
      return { ok: false, message: "Cette chanson n’est plus dans la corbeille." };
    await writeAuditLog({
      action: "song.purged",
      actorId: session.user.id,
      targetType: "song_group",
      targetId: songKey,
    });
    refresh();
    return { ok: true, message: "Chanson supprimée définitivement." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer cette chanson.") };
  }
}

export async function restoreUser(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireSuperAdmin();
    const { userId } = userIdSchema.parse(Object.fromEntries(formData));
    if (!(await restoreTrashedUser(userId, await headers())))
      return { ok: false, message: "Ce compte n’est plus dans la corbeille." };
    await writeAuditLog({ action: "user.restored", actorId: session.user.id, targetType: "user", targetId: userId });
    refresh();
    return { ok: true, message: "Compte restauré : il peut de nouveau se connecter." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de restaurer ce compte.") };
  }
}

export async function purgeUser(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireSuperAdmin();
    const { userId } = userIdSchema.parse(Object.fromEntries(formData));
    if (userId === session.user.id) throw new Error("Vous ne pouvez pas supprimer votre propre compte.");
    if (!(await purgeTrashedUser(userId))) return { ok: false, message: "Ce compte n’est plus dans la corbeille." };
    await writeAuditLog({ action: "user.purged", actorId: session.user.id, targetType: "user", targetId: userId });
    refresh();
    return { ok: true, message: "Compte supprimé définitivement." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer ce compte.") };
  }
}
