import "server-only";

import { and, eq, lt } from "drizzle-orm";
import { db, getServiceDb } from "@/db";
import { trashedUsers, user } from "@/db/schema";
import { purgeUserData } from "@/lib/account/purge-user-data";
import { auth } from "@/lib/auth";
import { isAdminAccountRole } from "@/lib/discover/auto-share";
import { expiryCutoff } from "./retention";

export const TRASH_BAN_REASON = "Compte supprimé (corbeille)";

export type TrashedUser = {
  userId: string;
  name: string;
  email: string;
  role: string | null;
  deletedAt: Date;
  deletedBy: string | null;
};

/**
 * Met un compte à la corbeille : il est suspendu (banni, sessions révoquées par Better Auth) mais rien n'est supprimé —
 * crédits, abonnements et chansons restent intacts jusqu'à la purge. Il disparaît de la liste Utilisateurs.
 * `headers` porte la session du Super Admin que Better Auth contrôle pour la suspension.
 */
export async function trashUser(input: { userId: string; deletedBy: string; headers: Headers }): Promise<boolean> {
  const database = getServiceDb();
  const [target] = await database
    .select({ id: user.id, banned: user.banned, banReason: user.banReason })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1);
  if (!target) return false;
  const [already] = await database
    .select({ id: trashedUsers.userId })
    .from(trashedUsers)
    .where(eq(trashedUsers.userId, input.userId))
    .limit(1);
  if (already) return true;

  await database.insert(trashedUsers).values({
    userId: input.userId,
    deletedBy: input.deletedBy,
    previousBanned: Boolean(target.banned),
    previousBanReason: target.banReason ?? null,
  });
  try {
    await auth.api.banUser({ body: { userId: input.userId, banReason: TRASH_BAN_REASON }, headers: input.headers });
  } catch (error) {
    await database.delete(trashedUsers).where(eq(trashedUsers.userId, input.userId));
    throw error;
  }
  return true;
}

export async function listTrashedUsers(): Promise<TrashedUser[]> {
  const rows = await getServiceDb()
    .select({
      userId: trashedUsers.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      deletedAt: trashedUsers.deletedAt,
      deletedBy: trashedUsers.deletedBy,
    })
    .from(trashedUsers)
    .innerJoin(user, eq(trashedUsers.userId, user.id))
    .orderBy(trashedUsers.deletedAt);
  return rows.reverse();
}

/** Restaure le compte : suspension levée (sauf s'il était déjà suspendu avant), ligne de corbeille retirée. */
export async function restoreTrashedUser(userId: string, headers: Headers): Promise<boolean> {
  const database = getServiceDb();
  const [entry] = await database.select().from(trashedUsers).where(eq(trashedUsers.userId, userId)).limit(1);
  if (!entry) return false;
  if (!entry.previousBanned) await auth.api.unbanUser({ body: { userId }, headers });
  await database.delete(trashedUsers).where(eq(trashedUsers.userId, userId));
  return true;
}

/**
 * Supprime définitivement un compte de la corbeille : mêmes données métier que la suppression en libre-service
 * (`purgeUserData`), puis le compte lui-même (les sessions, comptes liés, crédits et la ligne de corbeille partent en
 * cascade). Ne supprime jamais un compte administrateur. Renvoie false quand le compte n'est pas en corbeille.
 */
export async function purgeTrashedUser(userId: string): Promise<boolean> {
  const database = getServiceDb();
  const [entry] = await database
    .select({ role: user.role })
    .from(trashedUsers)
    .innerJoin(user, eq(trashedUsers.userId, user.id))
    .where(eq(trashedUsers.userId, userId))
    .limit(1);
  if (!entry) return false;
  if (isAdminAccountRole(entry.role))
    throw new Error("Un compte administrateur ne peut pas être purgé depuis la corbeille.");
  await purgeUserData(userId);
  await db.delete(user).where(eq(user.id, userId));
  return true;
}

/** Purge automatique : supprime les comptes en corbeille depuis plus longtemps que le délai. Renvoie leur nombre. */
export async function purgeExpiredTrashedUsers(retentionDays: number, now: Date = new Date()): Promise<number> {
  const expired = await getServiceDb()
    .select({ userId: trashedUsers.userId })
    .from(trashedUsers)
    .where(and(lt(trashedUsers.deletedAt, expiryCutoff(retentionDays, now))));
  let purged = 0;
  for (const { userId } of expired) {
    try {
      if (await purgeTrashedUser(userId)) purged += 1;
    } catch {
      // Un compte qui ne peut pas être purgé (ex. administrateur) reste en corbeille ; les autres continuent.
    }
  }
  return purged;
}
