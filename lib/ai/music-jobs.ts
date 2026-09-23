import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs } from "@/db/schema";
import { createMusicfulClient, getMusicfulProvider, MusicfulApiError } from "./musicful";
import { musicfulTasksSchema, type MusicfulGenerateRequest } from "@/lib/validation/ai";
import { createLogger } from "@/lib/observability/logger";

const logger = createLogger("music-jobs");

export class MusicJobOwnershipError extends Error {
  constructor() {
    super("MUSIC_JOB_NOT_FOUND");
  }
}

/**
 * Musicful's documented success response only shows `{ task_id }`, but the exact envelope
 * for `/v1/music/generate` isn't confirmed against a live account. Rather than trust a single
 * guessed shape (which would silently leave `providerTaskId` null and strand the job in
 * "processing" forever with no error), this checks the common wrapper conventions.
 */
function extractTaskId(response: unknown): string | null {
  const readId = (value: unknown): string | null => {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    const candidate = record.task_id ?? record.taskId ?? record.id;
    return typeof candidate === "string" && candidate ? candidate : null;
  };
  const direct = readId(response);
  if (direct) return direct;
  const data = response && typeof response === "object" ? (response as Record<string, unknown>).data : undefined;
  if (Array.isArray(data)) return readId(data[0]);
  return readId(data);
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
  const providerTaskId = extractTaskId(response);
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
    const isCompleted = !isFailed && Boolean(task.audio_url);
    const values = {
      providerSongId: task.song_id || job.providerSongId,
      title: task.title || job.title,
      style: task.style || job.style,
      durationSeconds: task.duration ?? job.durationSeconds,
      audioUrl: task.audio_url || job.audioUrl,
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
