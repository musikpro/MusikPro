import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { guestLinks } from "@/db/schema";
import { expiryCutoff } from "@/lib/trash/retention";
import type { GuestLinkFormValues } from "@/lib/validation/guest-links";

export type GuestLinkRecord = typeof guestLinks.$inferSelect;

/** Liens actifs ou désactivés (hors corbeille), les plus récents d'abord. */
export async function listGuestLinks(): Promise<GuestLinkRecord[]> {
  return getServiceDb()
    .select()
    .from(guestLinks)
    .where(isNull(guestLinks.deletedAt))
    .orderBy(desc(guestLinks.createdAt));
}

/** Liens en corbeille, les plus récemment supprimés d'abord. */
export async function listTrashedGuestLinks(): Promise<GuestLinkRecord[]> {
  return getServiceDb()
    .select()
    .from(guestLinks)
    .where(isNotNull(guestLinks.deletedAt))
    .orderBy(desc(guestLinks.deletedAt));
}

/** Un lien hors corbeille (page de modification). */
export async function getGuestLink(id: string): Promise<GuestLinkRecord | null> {
  const [row] = await getServiceDb()
    .select()
    .from(guestLinks)
    .where(and(eq(guestLinks.id, id), isNull(guestLinks.deletedAt)))
    .limit(1);
  return row ?? null;
}

async function assertSlugAvailable(slug: string, exceptId?: string) {
  const [row] = await getServiceDb()
    .select({ id: guestLinks.id, deletedAt: guestLinks.deletedAt })
    .from(guestLinks)
    .where(eq(guestLinks.slug, slug))
    .limit(1);
  if (row && row.id !== exceptId) {
    throw new Error(
      row.deletedAt
        ? "Ce lien existe déjà dans la corbeille : restaure-le ou supprime-le définitivement avant de le réutiliser."
        : "Ce lien existe déjà : choisis un autre nom.",
    );
  }
}

export async function createGuestLink(values: GuestLinkFormValues, actorId: string): Promise<GuestLinkRecord> {
  await assertSlugAvailable(values.slug);
  const [row] = await getServiceDb()
    .insert(guestLinks)
    .values({ id: randomUUID(), ...values, createdBy: actorId })
    .returning();
  return row;
}

export async function updateGuestLink(id: string, values: GuestLinkFormValues): Promise<GuestLinkRecord | null> {
  await assertSlugAvailable(values.slug, id);
  const [row] = await getServiceDb()
    .update(guestLinks)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(guestLinks.id, id), isNull(guestLinks.deletedAt)))
    .returning();
  return row ?? null;
}

/** Active ou désactive un lien hors corbeille. */
export async function setGuestLinkActive(id: string, active: boolean): Promise<boolean> {
  const rows = await getServiceDb()
    .update(guestLinks)
    .set({ active, updatedAt: new Date() })
    .where(and(eq(guestLinks.id, id), isNull(guestLinks.deletedAt)))
    .returning({ id: guestLinks.id });
  return rows.length > 0;
}

/** Suppression logique : le lien part en corbeille et cesse de fonctionner (désactivé). */
export async function trashGuestLink(id: string, actorId: string): Promise<GuestLinkRecord | null> {
  const [row] = await getServiceDb()
    .update(guestLinks)
    .set({ deletedAt: new Date(), deletedBy: actorId, active: false, updatedAt: new Date() })
    .where(and(eq(guestLinks.id, id), isNull(guestLinks.deletedAt)))
    .returning();
  return row ?? null;
}

/** Sort le lien de la corbeille ; il reste désactivé jusqu'à ce que le propriétaire le réactive. */
export async function restoreGuestLink(id: string): Promise<GuestLinkRecord | null> {
  const [row] = await getServiceDb()
    .update(guestLinks)
    .set({ deletedAt: null, deletedBy: null, updatedAt: new Date() })
    .where(and(eq(guestLinks.id, id), isNotNull(guestLinks.deletedAt)))
    .returning();
  return row ?? null;
}

/** Suppression définitive : uniquement un lien déjà en corbeille (garanti par la requête, pas seulement par l'écran). */
export async function purgeGuestLink(id: string): Promise<boolean> {
  const deleted = await getServiceDb()
    .delete(guestLinks)
    .where(and(eq(guestLinks.id, id), isNotNull(guestLinks.deletedAt)))
    .returning({ id: guestLinks.id });
  return deleted.length > 0;
}

/** Purge automatique des liens en corbeille depuis plus longtemps que le délai de conservation. */
export async function purgeExpiredGuestLinks(retentionDays: number, now: Date = new Date()): Promise<number> {
  const deleted = await getServiceDb()
    .delete(guestLinks)
    .where(and(isNotNull(guestLinks.deletedAt), lt(guestLinks.deletedAt, expiryCutoff(retentionDays, now))))
    .returning({ id: guestLinks.id });
  return deleted.length;
}
