import "server-only";
import { z } from "zod";

const API_BASE = "https://api.easycron.com/v1";
/** Nombre de passages lus : 288 par jour à 5 min, donc environ 8 h d'historique en une seule requête. */
const SAMPLE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 8_000;
/** Au-delà de ce délai sans passage (cron toutes les 5 min), le planificateur est considéré à l'arrêt. */
export const STALE_AFTER_MINUTES = 15;

export const EASYCRON_DASHBOARD_URL = "https://www.easycron.com/cron-jobs";

const jobIdSchema = z
  .string()
  .trim()
  .regex(/^\d{1,12}$/, "EASYCRON_CRON_JOB_ID doit être le numéro de la tâche.");

const logSchema = z.object({
  scheduled_time: z.string().nullable().optional(),
  fired_time: z.string().nullable().optional(),
  done_time: z.string().nullable().optional(),
  http_code: z.number().nullable().optional(),
  error: z.string().nullable().optional(),
  total_time: z.number().nullable().optional(),
});
const logsResponseSchema = z.object({
  logs: z.array(logSchema),
  meta: z.object({ total_count: z.number().optional() }).partial().optional(),
});

export type EasyCronLog = z.infer<typeof logSchema>;

export type SchedulerRun = {
  /** Instant du passage (ms, UTC). */
  at: number;
  ok: boolean;
  httpCode: number | null;
  seconds: number | null;
  error: string | null;
};

export type SchedulerStats = {
  runsSampled: number;
  failuresSampled: number;
  averageSeconds: number | null;
  /** Période couverte par l'échantillon, en heures (arrondie à l'heure). */
  coveredHours: number;
  last: SchedulerRun | null;
};

export type SchedulerStatus =
  | { ok: true; fetchedAt: number; dashboardUrl: string; stats: SchedulerStats }
  | { ok: false; configured: boolean; reason: string; dashboardUrl: string };

/** EasyCron renvoie des dates « AAAA-MM-JJ HH:MM:SS » exprimées en GMT/UTC. */
function parseUtc(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(`${value.trim().replace(" ", "T")}Z`);
  return Number.isFinite(time) ? time : null;
}

export function toRun(log: EasyCronLog): SchedulerRun | null {
  const at = parseUtc(log.fired_time) ?? parseUtc(log.scheduled_time);
  // Un passage sans heure de départ ou sans code de réponse n'a pas (encore) eu lieu : on l'ignore.
  if (at === null || log.http_code === null || log.http_code === undefined) return null;
  const error = log.error?.trim() ? log.error.trim() : null;
  return {
    at,
    ok: log.http_code >= 200 && log.http_code < 300 && error === null,
    httpCode: log.http_code,
    seconds: typeof log.total_time === "number" ? Math.round(log.total_time * 10) / 10 : null,
    error,
  };
}

/** Fonction pure (testée) : agrège les passages renvoyés par EasyCron, quel que soit leur ordre. */
export function computeSchedulerStats(logs: EasyCronLog[]): SchedulerStats {
  const runs = logs
    .map(toRun)
    .filter((run): run is SchedulerRun => run !== null)
    .sort((a, b) => b.at - a.at);
  const durations = runs.map((run) => run.seconds).filter((value): value is number => value !== null);
  const averageSeconds = durations.length
    ? Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10
    : null;
  const oldest = runs.at(-1);
  const newest = runs[0];
  return {
    runsSampled: runs.length,
    failuresSampled: runs.filter((run) => !run.ok).length,
    averageSeconds,
    coveredHours: oldest && newest ? Math.max(1, Math.round((newest.at - oldest.at) / 3_600_000)) : 0,
    last: newest ?? null,
  };
}

/**
 * État du planificateur EasyCron qui appelle /api/cron/reconcile-music-jobs. La clé d'API (EASYCRON_API_KEY) ne quitte
 * jamais le serveur et n'est jamais renvoyée au navigateur. Toute erreur est renvoyée sous forme de raison lisible : la
 * page Paramètres ne doit jamais planter parce qu'EasyCron est lent, injoignable ou mal configuré.
 */
export async function getSchedulerStatus(now = Date.now()): Promise<SchedulerStatus> {
  const apiKey = process.env.EASYCRON_API_KEY?.trim();
  const rawJobId = process.env.EASYCRON_CRON_JOB_ID;
  if (!apiKey || !rawJobId) {
    return {
      ok: false,
      configured: false,
      reason: "Les variables EASYCRON_API_KEY et EASYCRON_CRON_JOB_ID ne sont pas définies dans Vercel.",
      dashboardUrl: EASYCRON_DASHBOARD_URL,
    };
  }
  const jobId = jobIdSchema.safeParse(rawJobId);
  if (!jobId.success) {
    return {
      ok: false,
      configured: false,
      reason: jobId.error.issues[0].message,
      dashboardUrl: EASYCRON_DASHBOARD_URL,
    };
  }
  try {
    const response = await fetch(`${API_BASE}/cron-jobs/${jobId.data}/logs?page=1&page_size=${SAMPLE_SIZE}`, {
      headers: { Accept: "application/json", "X-API-Key": apiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Pas de cache de données : un cache Next.js resservait une ancienne réponse quand sa revalidation échouait. La page admin est rare et réservée au propriétaire, donc le quota d'appels reste très loin.
      cache: "no-store",
    });
    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        configured: true,
        reason: "EasyCron a refusé la clé d’API (vérifie EASYCRON_API_KEY).",
        dashboardUrl: EASYCRON_DASHBOARD_URL,
      };
    }
    if (!response.ok) throw new Error(`EasyCron a répondu HTTP ${response.status}`);
    const data = logsResponseSchema.parse(await response.json());
    return { ok: true, fetchedAt: now, dashboardUrl: EASYCRON_DASHBOARD_URL, stats: computeSchedulerStats(data.logs) };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      reason: error instanceof Error ? error.message : "Lecture de l’API EasyCron impossible.",
      dashboardUrl: EASYCRON_DASHBOARD_URL,
    };
  }
}
