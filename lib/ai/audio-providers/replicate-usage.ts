import "server-only";
import { sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs } from "@/db/schema";

export type ReplicateUsage = {
  predictions: number;
  succeeded: number;
  failed: number;
  /** Sum of Replicate's own `metrics.predict_time` (GPU seconds) over the stored jobs. */
  gpuSeconds: number;
  last30Days: number;
};

const EMPTY: ReplicateUsage = { predictions: 0, succeeded: 0, failed: 0, gpuSeconds: 0, last30Days: 0 };

/** Read-only aggregate for the admin panel; never throws (the page must render before the DB is reachable). */
export async function getReplicateUsage(): Promise<ReplicateUsage> {
  try {
    const [row] = await getServiceDb()
      .select({
        predictions: sql<number>`count(*)::int`,
        succeeded: sql<number>`count(*) filter (where ${musicGenerationJobs.status} = 'completed')::int`,
        failed: sql<number>`count(*) filter (where ${musicGenerationJobs.status} = 'failed')::int`,
        gpuSeconds: sql<number>`coalesce(sum((${musicGenerationJobs.responsePayload}->'metrics'->>'predict_time')::numeric), 0)::float`,
        last30Days: sql<number>`count(*) filter (where ${musicGenerationJobs.createdAt} > now() - interval '30 days')::int`,
      })
      .from(musicGenerationJobs)
      .where(sql`${musicGenerationJobs.provider} = 'replicate'`);
    return row ?? EMPTY;
  } catch {
    return EMPTY;
  }
}
