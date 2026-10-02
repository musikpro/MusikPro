import "server-only";
import { z } from "zod";

/** Dépôt qui héberge le workflow planifié (.github/workflows/reconcile-music-jobs.yml). */
export const SCHEDULER_REPOSITORY = "musikpro/MusikPro";
export const SCHEDULER_WORKFLOW_FILE = "reconcile-music-jobs.yml";

const API_BASE = `https://api.github.com/repos/${SCHEDULER_REPOSITORY}`;
const WINDOW_MS = 24 * 60 * 60 * 1000;
/** L'API GitHub non authentifiée est limitée à 60 requêtes/heure : on met chaque lecture en cache côté serveur. */
const CACHE_SECONDS = 60;
const REQUEST_TIMEOUT_MS = 8_000;

const runSchema = z.object({
  status: z.string(),
  conclusion: z.string().nullable(),
  event: z.string(),
  run_started_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  html_url: z.string(),
});
const runsSchema = z.object({ total_count: z.number(), workflow_runs: z.array(runSchema) });
const workflowSchema = z.object({ state: z.string(), html_url: z.string() });

export type SchedulerRun = z.infer<typeof runSchema>;

export type SchedulerStats = {
  runs24h: number;
  failures24h: number;
  /** Durée moyenne d'un passage (secondes), calculée sur l'échantillon récent (100 passages au maximum). */
  averageSeconds: number | null;
  /** Minutes d'exécution cumulées sur 24 h, extrapolées depuis l'échantillon. */
  estimatedMinutes24h: number;
  last: { at: string; conclusion: string | null; status: string; seconds: number | null; url: string } | null;
};

export type SchedulerStatus =
  | {
      ok: true;
      /** Instant de la lecture (ms), pour calculer « il y a X min » sans appeler Date.now() pendant le rendu. */
      fetchedAt: number;
      repository: string;
      workflowState: string;
      workflowUrl: string;
      actionsUrl: string;
      stats: SchedulerStats;
    }
  | { ok: false; repository: string; reason: string };

function runSeconds(run: SchedulerRun): number | null {
  if (run.status !== "completed") return null;
  const start = Date.parse(run.run_started_at ?? run.created_at);
  const end = Date.parse(run.updated_at);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.round((end - start) / 1000) : null;
}

/** Fonction pure (testée) : agrège les passages récents renvoyés par l'API GitHub. */
export function computeSchedulerStats(sample: SchedulerRun[], total24h: number, failures24h: number): SchedulerStats {
  const durations = sample.map(runSeconds).filter((value): value is number => value !== null);
  const averageSeconds = durations.length
    ? Math.round(durations.reduce((sum, v) => sum + v, 0) / durations.length)
    : null;
  const latest = sample[0];
  return {
    runs24h: total24h,
    failures24h,
    averageSeconds,
    estimatedMinutes24h: averageSeconds === null ? 0 : Math.round((averageSeconds * total24h) / 60),
    last: latest
      ? {
          at: latest.run_started_at ?? latest.created_at,
          conclusion: latest.conclusion,
          status: latest.status,
          seconds: runSeconds(latest),
          url: latest.html_url,
        }
      : null,
  };
}

async function githubJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: CACHE_SECONDS },
  });
  if (!response.ok) throw new Error(`GitHub a répondu HTTP ${response.status}`);
  return schema.parse(await response.json());
}

/**
 * État du planificateur GitHub Actions qui rattrape les générations musicales. Le dépôt est public, donc aucune clé
 * n'est nécessaire (et aucun secret n'est manipulé). Toute erreur est renvoyée sous forme de raison lisible : la page
 * Paramètres ne doit jamais planter parce que GitHub est lent ou injoignable.
 */
export async function getSchedulerStatus(now = Date.now()): Promise<SchedulerStatus> {
  try {
    const since = encodeURIComponent(`>=${new Date(now - WINDOW_MS).toISOString()}`);
    const base = `/actions/workflows/${SCHEDULER_WORKFLOW_FILE}/runs`;
    const [workflow, recent, failed] = await Promise.all([
      githubJson(`/actions/workflows/${SCHEDULER_WORKFLOW_FILE}`, workflowSchema),
      githubJson(`${base}?per_page=100&created=${since}`, runsSchema),
      githubJson(`${base}?per_page=1&status=failure&created=${since}`, runsSchema),
    ]);
    return {
      ok: true,
      fetchedAt: now,
      repository: SCHEDULER_REPOSITORY,
      workflowState: workflow.state,
      workflowUrl: workflow.html_url,
      actionsUrl: `https://github.com/${SCHEDULER_REPOSITORY}/actions/workflows/${SCHEDULER_WORKFLOW_FILE}`,
      stats: computeSchedulerStats(recent.workflow_runs, recent.total_count, failed.total_count),
    };
  } catch (error) {
    return {
      ok: false,
      repository: SCHEDULER_REPOSITORY,
      reason: error instanceof Error ? error.message : "Lecture de l’API GitHub impossible.",
    };
  }
}
