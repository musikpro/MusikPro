import "server-only";
import { and, eq, inArray, ne } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs } from "@/db/schema";

const PENDING_STATUSES = ["queued", "submitting", "processing"] as const;

/**
 * Vrai tant qu'une autre version de la même commande est encore en cours : on attend alors qu'elles soient toutes
 * prêtes (ou échouées) pour notifier une seule fois, au lieu d'alerter dès la première version terminée.
 * Sans groupe, il n'y a qu'une version : rien à attendre. Une lecture en échec ne bloque jamais la notification.
 */
export async function hasPendingSiblingVersion(job: { id: string; songGroupId: string | null }): Promise<boolean> {
  if (!job.songGroupId) return false;
  try {
    const rows = await getServiceDb()
      .select({ id: musicGenerationJobs.id })
      .from(musicGenerationJobs)
      .where(
        and(
          eq(musicGenerationJobs.songGroupId, job.songGroupId),
          ne(musicGenerationJobs.id, job.id),
          inArray(musicGenerationJobs.status, [...PENDING_STATUSES]),
        ),
      )
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}
