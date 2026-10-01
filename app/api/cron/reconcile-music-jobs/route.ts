import { and, asc, gte, inArray, isNotNull } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs } from "@/db/schema";
import { pollJobForProvider } from "@/lib/ai/audio-providers/dispatch";
import { createLogger } from "@/lib/observability/logger";
import { verifyCronRequest } from "@/lib/cron/auth";

const logger = createLogger("reconcile-music-jobs");

export const runtime = "nodejs";
export const maxDuration = 60;

/** Fenêtre de rattrapage : au-delà, un job « processing » est de toute façon périmé (délai max de polling dépassé). */
const LOOKBACK_MS = 24 * 60 * 60 * 1000;
const MAX_JOBS_PER_RUN = 40;
/** Marge de sécurité sous maxDuration : on s'arrête avant que Vercel ne coupe la fonction en plein polling. */
const TIME_BUDGET_MS = 45_000;
const CONCURRENCY = 4;

/**
 * Filet de sécurité serveur : un job Musicful n'avance normalement que lorsqu'un client interroge
 * `/api/songs/[groupId]`. Si l'onglet est fermé, la chanson reste « en cours » et le remboursement d'une
 * génération échouée n'a pas lieu. Cette route rejoue le même chemin (`pollJobForProvider` : finalisation MP3,
 * échec/timeout, remboursement) pour les jobs encore ouverts, sans changer aucune règle existante.
 */
async function handle(request: Request) {
  if (!verifyCronRequest(request)) return new Response("Unauthorized", { status: 401 });
  const startedAt = Date.now();
  const rows = await getServiceDb()
    .select({ id: musicGenerationJobs.id, userId: musicGenerationJobs.userId })
    .from(musicGenerationJobs)
    .where(
      and(
        inArray(musicGenerationJobs.status, ["processing"]),
        isNotNull(musicGenerationJobs.providerTaskId),
        isNotNull(musicGenerationJobs.userId),
        gte(musicGenerationJobs.createdAt, new Date(Date.now() - LOOKBACK_MS)),
      ),
    )
    .orderBy(asc(musicGenerationJobs.createdAt))
    .limit(MAX_JOBS_PER_RUN);

  const result = { checked: 0, completed: 0, failed: 0, stillProcessing: 0, errors: 0, skipped: 0 };
  const queue = rows.flatMap((row) => (row.userId ? [{ id: row.id, userId: row.userId }] : []));
  const worker = async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        result.skipped += 1 + queue.length;
        queue.length = 0;
        return;
      }
      result.checked += 1;
      try {
        const job = await pollJobForProvider(row.id, row.userId);
        if (job.status === "completed") result.completed += 1;
        else if (job.status === "failed") result.failed += 1;
        else result.stillProcessing += 1;
      } catch (error) {
        result.errors += 1;
        logger.error("Music job reconcile failed", {
          jobId: row.id,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
