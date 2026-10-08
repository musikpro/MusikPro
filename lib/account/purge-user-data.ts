import "server-only";

import { eq, inArray } from "drizzle-orm";
import { getServiceDb } from "@/db";
import {
  creationDrafts,
  discoverHiddenSongs,
  discoverSharedSongs,
  landingSongFeatures,
  musicGenerationJobs,
  notificationPreferences,
  pushDevices,
  songPublications,
  userNotifications,
} from "@/db/schema";

/**
 * Supprime les données métier d'un utilisateur avant la suppression de son compte (Better Auth supprime ensuite
 * lui-même `user`, sessions, comptes liés, crédits, abonnements par cascade).
 *
 * Pourquoi : `music_generation_jobs.user_id` est en `ON DELETE SET NULL` (et `song_publications.user_id` n'a pas de clé
 * étrangère) ; sans cette purge, les histoires, paroles et liens publics du compte resteraient en base, orphelins.
 * Les paiements ne sont volontairement pas touchés : la clé étrangère les détache du compte (`user_id` à null) et
 * l'historique comptable est conservé.
 *
 * Toutes les requêtes filtrent par `userId` et partent dans un seul `db.batch` (atomique) : si l'une échoue, rien
 * n'est supprimé et l'appelant interrompt la suppression du compte.
 */
export async function purgeUserData(userId: string): Promise<void> {
  if (!userId || userId.length > 256) throw new Error("Identifiant utilisateur invalide");
  const db = getServiceDb();
  const ownGroups = db
    .select({ id: songPublications.songGroupId })
    .from(songPublications)
    .where(eq(songPublications.userId, userId));
  const ownJobGroups = db
    .select({ id: musicGenerationJobs.songGroupId })
    .from(musicGenerationJobs)
    .where(eq(musicGenerationJobs.userId, userId));
  await db.batch([
    db.delete(discoverSharedSongs).where(eq(discoverSharedSongs.userId, userId)),
    db.delete(discoverHiddenSongs).where(inArray(discoverHiddenSongs.songGroupId, ownGroups)),
    db.delete(discoverHiddenSongs).where(inArray(discoverHiddenSongs.songGroupId, ownJobGroups)),
    db.delete(landingSongFeatures).where(inArray(landingSongFeatures.songGroupId, ownGroups)),
    db.delete(landingSongFeatures).where(inArray(landingSongFeatures.songGroupId, ownJobGroups)),
    db.delete(songPublications).where(eq(songPublications.userId, userId)),
    db.delete(musicGenerationJobs).where(eq(musicGenerationJobs.userId, userId)),
    db.delete(creationDrafts).where(eq(creationDrafts.userId, userId)),
    db.delete(userNotifications).where(eq(userNotifications.userId, userId)),
    db.delete(pushDevices).where(eq(pushDevices.userId, userId)),
    db.delete(notificationPreferences).where(eq(notificationPreferences.userId, userId)),
  ]);
}
