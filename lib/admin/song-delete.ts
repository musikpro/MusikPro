import "server-only";

import { eq, inArray } from "drizzle-orm";
import { getServiceDb } from "@/db";
import {
  discoverHiddenSongs,
  discoverSharedSongs,
  landingSongFeatures,
  musicGenerationJobs,
  songPublications,
  trendingSettings,
} from "@/db/schema";

export type DeletedSong = { title: string | null; versions: number; songGroupId: string | null };

/**
 * Supprime définitivement une chanson depuis le tableau de bord propriétaire : toutes ses versions (le groupe), ainsi
 * que ce qui la référence — partage et retrait Découvrir, lien public, emplacements « mis en avant » de la page
 * d'accueil et vivier manuel de « Tendances ». Une génération ancienne sans groupe ne supprime que sa propre ligne.
 * Les crédits ne sont pas rendus (la chanson a été produite) et les fichiers audio restent chez l'hébergeur.
 * Renvoie null quand la chanson n'existe plus.
 */
export async function deleteSongByJobId(jobId: string): Promise<DeletedSong | null> {
  const database = getServiceDb();
  const [job] = await database
    .select({
      id: musicGenerationJobs.id,
      title: musicGenerationJobs.title,
      songGroupId: musicGenerationJobs.songGroupId,
    })
    .from(musicGenerationJobs)
    .where(eq(musicGenerationJobs.id, jobId))
    .limit(1);
  if (!job) return null;

  const groupId = job.songGroupId;
  const versions = groupId
    ? await database
        .select({ id: musicGenerationJobs.id })
        .from(musicGenerationJobs)
        .where(eq(musicGenerationJobs.songGroupId, groupId))
    : [{ id: job.id }];

  if (groupId) {
    const [trending] = await database.select().from(trendingSettings).where(eq(trendingSettings.id, "global")).limit(1);
    const manual = Array.isArray(trending?.manualSelection) ? (trending.manualSelection as string[]) : [];
    const covers = (trending?.coverOverrides ?? {}) as Record<string, string>;
    const cleanedCovers = Object.fromEntries(Object.entries(covers).filter(([id]) => id !== groupId));
    await database.batch([
      database.delete(landingSongFeatures).where(eq(landingSongFeatures.songGroupId, groupId)),
      database.delete(discoverSharedSongs).where(eq(discoverSharedSongs.songGroupId, groupId)),
      database.delete(discoverHiddenSongs).where(eq(discoverHiddenSongs.songGroupId, groupId)),
      database.delete(songPublications).where(eq(songPublications.songGroupId, groupId)),
      ...(trending
        ? [
            database
              .update(trendingSettings)
              .set({
                manualSelection: manual.filter((id) => id !== groupId),
                coverOverrides: cleanedCovers,
                updatedAt: new Date(),
              })
              .where(eq(trendingSettings.id, "global")),
          ]
        : []),
      database.delete(musicGenerationJobs).where(
        inArray(
          musicGenerationJobs.id,
          versions.map((version) => version.id),
        ),
      ),
    ]);
  } else {
    await database.delete(musicGenerationJobs).where(eq(musicGenerationJobs.id, job.id));
  }
  return { title: job.title, versions: versions.length, songGroupId: groupId };
}
