import "server-only";

/**
 * Statistiques du planificateur GitHub Actions qui appelle /api/cron/reconcile-music-jobs (voir
 * .github/workflows/reconcile-music-jobs.yml). Lecture seule via l'API publique de GitHub : aucun secret
 * requis tant que le dépôt est public. Affichées dans /admin/settings.
 */

export const SCHEDULER_WORKFLOW_FILE = "reconcile-music-jobs.yml";
export const SCHEDULER_EXPECTED_INTERVAL_MINUTES = 5;
/** Au-delà, GitHub retarde nettement le planificateur : le panneau le signale. */
export const SCHEDULER_DELAY_ALERT_MINUTES = 15;

const SAMPLE_SIZE = 30;
const WINDOW_DAYS = 30;
const FALLBACK_REPOSITORY = "musikpro/MusikPro";

export type GithubRun = {
  id: number;
  event: string;
  status: string | null;
  conclusion: string | null;
  created_at: string;
  run_started_at?: string | null;
  updated_at: string;
  html_url: string;
};

export type SchedulerStats = {
  lastRun: { at: string; event: string; conclusion: string | null; status: string | null; url: string } | null;
  sampleSize: number;
  successRatePercent: number | null;
  /** Intervalle moyen réel entre deux passages planifiés (minutes), null s'il y en a moins de deux. */
  averageIntervalMinutes: number | null;
  averageRunSeconds: number | null;
  runsLast30Days: number;
  /** Minutes Actions facturables estimées sur 30 jours (chaque run est arrondi à la minute supérieure). */
  estimatedMinutes30Days: number;
  delayed: boolean;
};

const completed = (run: GithubRun) => run.status === "completed";

function runSeconds(run: GithubRun) {
  const start = Date.parse(run.run_started_at || run.created_at);
  const end = Date.parse(run.updated_at);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.round((end - start) / 1000) : 0;
}

/** Pur et testable : transforme la liste de runs (du plus récent au plus ancien) en indicateurs. */
export function computeSchedulerStats(runs: GithubRun[], totalRunsLast30Days: number): SchedulerStats {
  const sample = runs.slice(0, SAMPLE_SIZE);
  const finished = sample.filter(completed);
  const successes = finished.filter((run) => run.conclusion === "success").length;

  const scheduledTimes = sample
    .filter((run) => run.event === "schedule")
    .map((run) => Date.parse(run.created_at))
    .filter(Number.isFinite);
  const gaps = scheduledTimes.slice(0, -1).map((time, index) => (time - scheduledTimes[index + 1]) / 60_000);
  const averageIntervalMinutes = gaps.length ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : null;

  const durations = finished.map(runSeconds);
  const averageRunSeconds = durations.length
    ? durations.reduce((sum, value) => sum + value, 0) / durations.length
    : null;
  const billedPerRun = durations.length
    ? durations.reduce((sum, value) => sum + Math.max(1, Math.ceil(value / 60)), 0) / durations.length
    : 0;

  const [latest] = sample;
  return {
    lastRun: latest
      ? {
          at: latest.created_at,
          event: latest.event,
          conclusion: latest.conclusion,
          status: latest.status,
          url: latest.html_url,
        }
      : null,
    sampleSize: sample.length,
    successRatePercent: finished.length ? Math.round((successes / finished.length) * 100) : null,
    averageIntervalMinutes: averageIntervalMinutes === null ? null : Math.round(averageIntervalMinutes * 10) / 10,
    averageRunSeconds: averageRunSeconds === null ? null : Math.round(averageRunSeconds),
    runsLast30Days: totalRunsLast30Days,
    estimatedMinutes30Days: Math.round(totalRunsLast30Days * billedPerRun),
    delayed: averageIntervalMinutes !== null && averageIntervalMinutes > SCHEDULER_DELAY_ALERT_MINUTES,
  };
}

export type SchedulerSnapshot =
  | { ok: true; repository: string; isPrivate: boolean; actionsUrl: string; stats: SchedulerStats }
  | { ok: false; repository: string; reason: string };

function repositoryName() {
  const owner = process.env.VERCEL_GIT_REPO_OWNER?.trim();
  const slug = process.env.VERCEL_GIT_REPO_SLUG?.trim();
  return owner && slug ? `${owner}/${slug}` : FALLBACK_REPOSITORY;
}

async function githubJson<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`GitHub a répondu ${response.status}`);
  return (await response.json()) as T;
}

/** Ne lève jamais : un GitHub injoignable ou limité ne doit pas casser la page Paramètres. */
export async function getSchedulerSnapshot(): Promise<SchedulerSnapshot> {
  const repository = repositoryName();
  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
    const [repo, runs] = await Promise.all([
      githubJson<{ private: boolean; html_url: string }>(`/repos/${repository}`),
      githubJson<{ total_count: number; workflow_runs: GithubRun[] }>(
        `/repos/${repository}/actions/workflows/${SCHEDULER_WORKFLOW_FILE}/runs?per_page=100&created=%3E%3D${since}`,
      ),
    ]);
    return {
      ok: true,
      repository,
      isPrivate: repo.private,
      actionsUrl: `${repo.html_url}/actions/workflows/${SCHEDULER_WORKFLOW_FILE}`,
      stats: computeSchedulerStats(runs.workflow_runs, runs.total_count),
    };
  } catch (error) {
    return { ok: false, repository, reason: error instanceof Error ? error.message : "inconnue" };
  }
}
