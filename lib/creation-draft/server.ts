import "server-only";

import { randomUUID } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { creationDrafts } from "@/db/schema";
import { createLogger } from "@/lib/observability/logger";
import {
  CREATION_DRAFT_TTL_DAYS,
  CREATION_DRAFT_STEPS,
  creationDraftDataSchema,
  isCreationDraftWorthKeeping,
  type CreationDraftData,
  type CreationDraftSave,
  type CreationDraftStep,
} from "@/lib/validation/creation-draft";

const logger = createLogger("creation-draft");
const DAY_MS = 24 * 60 * 60 * 1000;

export type CreationDraft = {
  step: CreationDraftStep;
  data: CreationDraftData;
  updatedAt: Date;
};

/**
 * Brouillon de création de l'utilisateur, ou null. Toujours filtré par `user_id` (jamais d'identifiant venant du
 * client). Lecture tolérante : si la table n'existe pas encore (migration non appliquée) ou si le contenu est
 * invalide/périmé, on renvoie null pour que le parcours de création reste utilisable.
 */
export async function getCreationDraft(userId: string): Promise<CreationDraft | null> {
  try {
    const database = getServiceDb();
    const [row] = await database.select().from(creationDrafts).where(eq(creationDrafts.userId, userId)).limit(1);
    if (!row) return null;
    const step = CREATION_DRAFT_STEPS.find((candidate) => candidate === row.step);
    const data = creationDraftDataSchema.safeParse(row.data);
    if (row.expiresAt.getTime() <= Date.now() || !step || !data.success || !isCreationDraftWorthKeeping(data.data)) {
      await database.delete(creationDrafts).where(eq(creationDrafts.userId, userId));
      return null;
    }
    return { step, data: data.data, updatedAt: row.updatedAt };
  } catch (error) {
    logger.error("creation draft read failed", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/** Enregistre (remplace) le brouillon et prolonge son expiration de 30 jours. Purge au passage les brouillons périmés. */
export async function saveCreationDraft(userId: string, save: CreationDraftSave): Promise<void> {
  const database = getServiceDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CREATION_DRAFT_TTL_DAYS * DAY_MS);
  await database
    .insert(creationDrafts)
    .values({ id: randomUUID(), userId, step: save.step, data: save.data, updatedAt: now, expiresAt })
    .onConflictDoUpdate({
      target: creationDrafts.userId,
      set: { step: save.step, data: save.data, updatedAt: now, expiresAt },
    });
  // Purge opportuniste (index sur expires_at) : pas de tâche planifiée supplémentaire à maintenir.
  await database
    .delete(creationDrafts)
    .where(lt(creationDrafts.expiresAt, now))
    .catch(() => undefined);
}

/** Supprime le brouillon (Recommencer, ou chanson générée). Sans effet s'il n'existe pas ; ne lève jamais. */
export async function deleteCreationDraft(userId: string): Promise<void> {
  try {
    await getServiceDb().delete(creationDrafts).where(eq(creationDrafts.userId, userId));
  } catch (error) {
    logger.error("creation draft delete failed", { error: error instanceof Error ? error.message : String(error) });
  }
}
