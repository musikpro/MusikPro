import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs } from "@/db/schema";
import { createMusicfulClient, getMusicfulProvider, MusicfulApiError } from "./musicful";
import { musicfulTasksSchema, type MusicfulGenerateRequest } from "@/lib/validation/ai";
import { createLogger } from "@/lib/observability/logger";

const logger = createLogger("music-jobs");

type JobRow = typeof musicGenerationJobs.$inferSelect;

export class MusicJobOwnershipError extends Error {
  constructor() {
    super("MUSIC_JOB_NOT_FOUND");
  }
}

/**
 * Musicful's documented success response only shows `{ task_id }`, but a live account
 * confirms the real `/v1/music/generate` envelope is `{ data: { ids: [id1, id2] }, status,
 * message }` — ONE call returns TWO task ids (Musicful always generates a pair of variants
 * per auto-generate request). This checks that real shape first, then falls back to other
 * common wrapper conventions so a single well-formed id is still picked up if the provider
 * ever changes its envelope.
 */
function extractTaskIds(response: unknown): string[] {
  const readId = (value: unknown): string | null => {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    const candidate = record.task_id ?? record.taskId ?? record.id;
    return typeof candidate === "string" && candidate ? candidate : null;
  };
  const direct = readId(response);
  if (direct) return [direct];
  const data = response && typeof response === "object" ? (response as Record<string, unknown>).data : undefined;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const ids = (data as Record<string, unknown>).ids;
    if (Array.isArray(ids)) {
      const found = ids.filter((id): id is string => typeof id === "string" && id.length > 0);
      if (found.length) return found;
    }
  }
  if (Array.isArray(data)) {
    const found = data.map(readId).filter((id): id is string => Boolean(id));
    if (found.length) return found;
  }
  const single = readId(data);
  return single ? [single] : [];
}

export type MusicJobGroupContext = {
  songGroupId?: string;
  versionLabel?: string;
  occasion?: string;
};

export async function createMusicJob(userId: string, input: MusicfulGenerateRequest, model: string, context: MusicJobGroupContext = {}) {
  const database = getServiceDb();
  const id = randomUUID();
  const [job] = await database
    .insert(musicGenerationJobs)
    .values({
      id,
      userId,
      provider: "musicful",
      action: "auto",
      model,
      prompt: input.prompt || null,
      lyrics: input.lyrics || null,
      style: input.style || null,
      title: input.title || null,
      occasion: context.occasion || null,
      songGroupId: context.songGroupId || null,
      versionLabel: context.versionLabel || null,
      instrumental: input.instrumental === 1,
      gender: input.gender || null,
      status: "queued",
      requestPayload: input,
    })
    .returning();
  return job;
}

export async function submitMusicJob(jobId: string) {
  const database = getServiceDb();
  const [job] = await database.select().from(musicGenerationJobs).where(eq(musicGenerationJobs.id, jobId)).limit(1);
  if (!job) throw new MusicJobOwnershipError();
  const provider = await getMusicfulProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("MUSICFUL_NOT_CONFIGURED");
  const client = createMusicfulClient(provider.apiKey, provider.baseUrl, provider.timeoutMs);
  await database.update(musicGenerationJobs).set({ status: "submitting", startedAt: new Date(), updatedAt: new Date() }).where(eq(musicGenerationJobs.id, jobId));
  let response: unknown;
  try {
    response = await client.generateMusicAuto({
      style: job.style,
      mv: job.model,
      instrumental: job.instrumental ? 1 : 0,
      gender: (job.gender as "male" | "female" | "" | null) || undefined,
    });
  } catch (error) {
    const failureReason = error instanceof MusicfulApiError ? `HTTP ${error.status}` : "submission_failed";
    await database
      .update(musicGenerationJobs)
      .set({ status: "failed", failureReason, failedAt: new Date(), updatedAt: new Date() })
      .where(eq(musicGenerationJobs.id, jobId));
    throw error;
  }
  const providerTaskId = extractTaskIds(response)[0] ?? null;
  if (!providerTaskId) {
    logger.error("Musicful generate response had no extractable task id", { jobId, response });
    await database
      .update(musicGenerationJobs)
      .set({ status: "failed", failureReason: "MUSICFUL_TASK_ID_MISSING", responsePayload: response, failedAt: new Date(), updatedAt: new Date() })
      .where(eq(musicGenerationJobs.id, jobId));
    throw new Error("MUSICFUL_TASK_ID_MISSING");
  }
  await database
    .update(musicGenerationJobs)
    .set({ providerTaskId, status: "processing", responsePayload: response, updatedAt: new Date() })
    .where(eq(musicGenerationJobs.id, jobId));
  return { ...job, providerTaskId, status: "processing" as const };
}

/**
 * Submits ONE Musicful generate call shared by every job in a song group. Musicful's auto
 * endpoint always returns a pair of task ids (`{ data: { ids: [...] } }`) for a single
 * request, so calling it once per version (as the group's job count would suggest) would
 * double-submit to the provider and only ever have one id to assign. Instead this submits
 * once — using the first job's generation params, which are identical across versions by
 * construction — and distributes the returned ids across the group's jobs in order.
 */
export async function submitSongGroupJobs(jobIds: string[]): Promise<{ succeeded: number; failed: number }> {
  if (!jobIds.length) return { succeeded: 0, failed: 0 };
  const database = getServiceDb();
  const jobs = await database.select().from(musicGenerationJobs).where(inArray(musicGenerationJobs.id, jobIds));
  const ordered = jobIds.map((id) => jobs.find((job) => job.id === id)).filter((job): job is JobRow => Boolean(job));
  if (!ordered.length) return { succeeded: 0, failed: 0 };
  const [primary] = ordered;
  const provider = await getMusicfulProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("MUSICFUL_NOT_CONFIGURED");
  const client = createMusicfulClient(provider.apiKey, provider.baseUrl, provider.timeoutMs);
  await Promise.all(
    ordered.map((job) =>
      database.update(musicGenerationJobs).set({ status: "submitting", startedAt: new Date(), updatedAt: new Date() }).where(eq(musicGenerationJobs.id, job.id)),
    ),
  );
  let response: unknown;
  try {
    response = await client.generateMusicAuto({
      style: primary.style,
      mv: primary.model,
      instrumental: primary.instrumental ? 1 : 0,
      gender: (primary.gender as "male" | "female" | "" | null) || undefined,
    });
  } catch (error) {
    const failureReason = error instanceof MusicfulApiError ? `HTTP ${error.status}` : "submission_failed";
    await Promise.all(
      ordered.map((job) =>
        database
          .update(musicGenerationJobs)
          .set({ status: "failed", failureReason, failedAt: new Date(), updatedAt: new Date() })
          .where(eq(musicGenerationJobs.id, job.id)),
      ),
    );
    return { succeeded: 0, failed: ordered.length };
  }
  const providerTaskIds = extractTaskIds(response);
  if (!providerTaskIds.length) {
    logger.error("Musicful generate response had no extractable task ids", { jobIds: ordered.map((job) => job.id), response });
  }
  let succeeded = 0;
  await Promise.all(
    ordered.map((job, index) => {
      const providerTaskId = providerTaskIds[index];
      if (providerTaskId) {
        succeeded += 1;
        return database
          .update(musicGenerationJobs)
          .set({ providerTaskId, status: "processing", responsePayload: response, updatedAt: new Date() })
          .where(eq(musicGenerationJobs.id, job.id));
      }
      return database
        .update(musicGenerationJobs)
        .set({ status: "failed", failureReason: "MUSICFUL_TASK_ID_MISSING", responsePayload: response, failedAt: new Date(), updatedAt: new Date() })
        .where(eq(musicGenerationJobs.id, job.id));
    }),
  );
  return { succeeded, failed: ordered.length - succeeded };
}

async function getOwnedJob(jobId: string, userId: string) {
  const database = getServiceDb();
  const [job] = await database
    .select()
    .from(musicGenerationJobs)
    .where(and(eq(musicGenerationJobs.id, jobId), eq(musicGenerationJobs.userId, userId)))
    .limit(1);
  if (!job) throw new MusicJobOwnershipError();
  return job;
}

/**
 * A live account confirms Musicful hands back an `audio_url` the moment its internal status
 * flips, but that first URL is a redirect through a third-party stream host that can 403 with
 * "Invalid or expired stream URL" — the real, stable file only appears at `files.musicful.ai`
 * a bit later once their pipeline finishes copying it. Rather than trust `audio_url` being
 * non-empty, this fetches a byte range and only accepts it once it actually serves audio.
 */
async function isAudioUrlPlayable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1023" }, signal: controller.signal });
    if (!response.ok) return false;
    const contentType = response.headers.get("content-type") || "";
    return contentType.startsWith("audio/");
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function pollMusicJob(jobId: string, userId: string) {
  const job = await getOwnedJob(jobId, userId);
  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled" || !job.providerTaskId) return job;
  const provider = await getMusicfulProvider();
  if (!provider.apiKey) return job;
  const client = createMusicfulClient(provider.apiKey, provider.baseUrl, provider.timeoutMs);
  const database = getServiceDb();
  try {
    const tasks = musicfulTasksSchema.parse(await client.getTasks(job.providerTaskId));
    const task = tasks.find((entry) => entry.id === job.providerTaskId) || tasks[0];
    if (!task) return job;
    // Musicful's numeric `status` codes aren't publicly documented; we infer state from
    // the documented content fields (audio_url / fail_code) instead of guessing the enum.
    const isFailed = task.fail_code != null;
    const candidateAudioUrl = !isFailed ? task.audio_url || null : null;
    const audioReady = candidateAudioUrl ? await isAudioUrlPlayable(candidateAudioUrl) : false;
    const isCompleted = !isFailed && audioReady;
    // Musicful reports `duration` in milliseconds (confirmed against a live completed task:
    // 179614 ≈ a 3-minute song), and -1 while still processing.
    const durationSeconds =
      typeof task.duration === "number" && task.duration > 0 ? Math.round(task.duration / 1000) : job.durationSeconds;
    const values = {
      providerSongId: task.song_id || job.providerSongId,
      title: job.title || task.title,
      style: task.style || job.style,
      durationSeconds,
      audioUrl: isCompleted ? candidateAudioUrl : job.audioUrl,
      coverUrl: task.cover_url || job.coverUrl,
      providerStatus: task.status,
      responsePayload: task,
      status: isCompleted ? ("completed" as const) : isFailed ? ("failed" as const) : ("processing" as const),
      failureCode: isFailed ? task.fail_code : job.failureCode,
      failureReason: isFailed ? task.fail_reason || "provider_task_failed" : job.failureReason,
      completedAt: isCompleted ? new Date() : job.completedAt,
      failedAt: isFailed ? new Date() : job.failedAt,
      updatedAt: new Date(),
    };
    await database.update(musicGenerationJobs).set(values).where(eq(musicGenerationJobs.id, job.id));
    return { ...job, ...values };
  } catch (error) {
    logger.error("Musicful task poll failed", { jobId: job.id, providerTaskId: job.providerTaskId, error: error instanceof Error ? error.message : "unknown" });
    return job;
  }
}

async function requireCompletedOwnedJob(jobId: string, userId: string) {
  const job = await getOwnedJob(jobId, userId);
  if (job.status !== "completed" || !job.providerSongId) throw new Error("MUSIC_JOB_NOT_READY");
  return job;
}

export async function requestWavConversion(jobId: string, userId: string) {
  const job = await requireCompletedOwnedJob(jobId, userId);
  const provider = await getMusicfulProvider();
  if (!provider.apiKey) throw new Error("MUSICFUL_NOT_CONFIGURED");
  const client = createMusicfulClient(provider.apiKey, provider.baseUrl, provider.timeoutMs);
  const result = await client.convertToWav(job.providerSongId!);
  const database = getServiceDb();
  await database.update(musicGenerationJobs).set({ wavUrl: result.url || null, updatedAt: new Date() }).where(eq(musicGenerationJobs.id, job.id));
  return { ...job, wavUrl: result.url || null };
}

export async function requestMp4Conversion(jobId: string, userId: string) {
  const job = await requireCompletedOwnedJob(jobId, userId);
  const provider = await getMusicfulProvider();
  if (!provider.apiKey) throw new Error("MUSICFUL_NOT_CONFIGURED");
  const client = createMusicfulClient(provider.apiKey, provider.baseUrl, provider.timeoutMs);
  const result = await client.convertToMp4(job.providerSongId!);
  const database = getServiceDb();
  await database.update(musicGenerationJobs).set({ mp4Url: result.url || null, updatedAt: new Date() }).where(eq(musicGenerationJobs.id, job.id));
  return { ...job, mp4Url: result.url || null };
}

export async function getJobForUser(jobId: string, userId: string) {
  return getOwnedJob(jobId, userId);
}
