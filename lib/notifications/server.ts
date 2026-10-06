import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { userNotifications } from "@/db/schema";
import { createLogger } from "@/lib/observability/logger";
import {
  NOTIFICATIONS_PAGE_SIZE,
  isInternalNotificationHref,
  type NotificationType,
} from "@/lib/validation/notifications";

const logger = createLogger("notifications");

export type NotificationView = {
  id: string;
  type: string;
  subject: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export type NewNotification = {
  userId: string;
  type: NotificationType;
  /** Identifiant stable de l'événement : une seule notification par (utilisateur, clé). */
  dedupeKey: string;
  href?: string | null;
  subject?: string | null;
};

/**
 * Crée une notification, une seule fois par `dedupeKey`. Renvoie `true` si elle vient d'être créée (le seul cas où un
 * envoi push est utile), `false` si elle existait déjà. Ne lève jamais : une notification manquée ne doit pas faire
 * échouer la fin d'une génération.
 */
export async function createNotification(input: NewNotification): Promise<boolean> {
  try {
    const rows = await getServiceDb()
      .insert(userNotifications)
      .values({
        id: randomUUID(),
        userId: input.userId,
        type: input.type,
        dedupeKey: input.dedupeKey.slice(0, 200),
        href: isInternalNotificationHref(input.href) ? input.href : null,
        subject: input.subject ? input.subject.slice(0, 200) : null,
      })
      .onConflictDoNothing({ target: [userNotifications.userId, userNotifications.dedupeKey] })
      .returning({ id: userNotifications.id });
    return rows.length > 0;
  } catch (error) {
    logger.error("notification create failed", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/** Les notifications les plus récentes de l'utilisateur et le nombre de non lues. Toujours filtré par `userId`. */
export async function listNotifications(userId: string): Promise<{ items: NotificationView[]; unread: number }> {
  const database = getServiceDb();
  const [rows, [counts]] = await Promise.all([
    database
      .select()
      .from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt))
      .limit(NOTIFICATIONS_PAGE_SIZE),
    database
      .select({ unread: sql<number>`count(*)::int` })
      .from(userNotifications)
      .where(and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt))),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      subject: row.subject,
      href: row.href,
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
    })),
    unread: counts?.unread ?? 0,
  };
}

/** Marque comme lues des notifications de l'utilisateur (`ids`) ou toutes (`ids` absent). Jamais celles d'un autre. */
export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  const owner = and(eq(userNotifications.userId, userId), isNull(userNotifications.readAt));
  await getServiceDb()
    .update(userNotifications)
    .set({ readAt: new Date() })
    .where(ids ? and(owner, inArray(userNotifications.id, ids)) : owner);
}
