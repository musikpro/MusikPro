import "server-only";

import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { notificationPreferences, pushDevices } from "@/db/schema";
import type { NotificationPreferences, PushDeviceRegisterInput } from "@/lib/validation/notifications";

export type PushDevice = { id: string; token: string; locale: string };

/**
 * Enregistre (ou réassigne) un appareil. Le jeton est unique : si un autre compte se connecte sur le même appareil,
 * la ligne change de propriétaire, l'ancien compte ne reçoit plus rien sur ce téléphone.
 */
export async function registerPushDevice(userId: string, input: PushDeviceRegisterInput): Promise<void> {
  const now = new Date();
  await getServiceDb()
    .insert(pushDevices)
    .values({ id: randomUUID(), userId, token: input.token, platform: input.platform, locale: input.locale })
    .onConflictDoUpdate({
      target: pushDevices.token,
      set: { userId, platform: input.platform, locale: input.locale, lastSeenAt: now },
    });
}

/** Retire un appareil du compte (déconnexion, notifications coupées). Ne touche jamais un jeton d'un autre compte. */
export async function removePushDevice(userId: string, token: string): Promise<void> {
  const database = getServiceDb();
  const rows = await database
    .select({ id: pushDevices.id, userId: pushDevices.userId })
    .from(pushDevices)
    .where(eq(pushDevices.token, token));
  const own = rows.filter((row) => row.userId === userId).map((row) => row.id);
  if (own.length) await database.delete(pushDevices).where(inArray(pushDevices.id, own));
}

export async function listPushDevices(userId: string): Promise<PushDevice[]> {
  return getServiceDb()
    .select({ id: pushDevices.id, token: pushDevices.token, locale: pushDevices.locale })
    .from(pushDevices)
    .where(eq(pushDevices.userId, userId));
}

/** Supprime des appareils dont Firebase a signalé le jeton comme invalide ou désinscrit. */
export async function deletePushDevicesByToken(tokens: string[]): Promise<void> {
  if (tokens.length) await getServiceDb().delete(pushDevices).where(inArray(pushDevices.token, tokens));
}

/** Préférences de l'utilisateur ; sans ligne, tout est activé. */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const [row] = await getServiceDb()
    .select({ songReady: notificationPreferences.songReady })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return { songReady: row?.songReady ?? true };
}

export async function saveNotificationPreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
  await getServiceDb()
    .insert(notificationPreferences)
    .values({ userId, songReady: preferences.songReady })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: { songReady: preferences.songReady, updatedAt: new Date() },
    });
}
