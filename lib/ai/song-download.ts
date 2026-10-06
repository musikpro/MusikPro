import "server-only";
import { and, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs } from "@/db/schema";

/**
 * Titre d'une chanson terminée dont le fichier audio (`audio_url`) appartient à cet utilisateur, ou `null`.
 * Sert de garde à `GET /api/songs/download` : seule une URL lue en base pour ce compte est relayée, jamais une URL
 * fournie telle quelle par le navigateur.
 */
export async function findOwnedCompletedAudio(userId: string, audioUrl: string): Promise<{ title: string | null } | null> {
  const [row] = await getServiceDb()
    .select({ title: musicGenerationJobs.title })
    .from(musicGenerationJobs)
    .where(
      and(
        eq(musicGenerationJobs.userId, userId),
        eq(musicGenerationJobs.audioUrl, audioUrl),
        eq(musicGenerationJobs.status, "completed"),
      ),
    )
    .limit(1);
  return row ?? null;
}
