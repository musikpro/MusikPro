import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs } from "@/db/schema";
import { createLogger } from "@/lib/observability/logger";
import { writeAuditLog } from "@/lib/security/audit";
import { getAudioProviderConfig } from "../musicful";
import { ensureVerifiedMp3, getJobForUser, pollMusicJob, submitSongGroupJobs, type Mp3Resolution } from "../music-jobs";
import { getAudioProviderDefinition } from "./catalog";
import { getAudioWebhookUrl } from "./webhook";
import { getAudioAdapter } from "./registry";
import type { AudioProviderRuntimeConfig } from "./types";

const logger = createLogger("audio-provider-dispatch");

type JobRow = typeof musicGenerationJobs.$inferSelect;

async function loadRuntimeConfig(
  providerId: string,
): Promise<AudioProviderRuntimeConfig & { maxPollingMinutes: number }> {
  const provider = await getAudioProviderConfig(providerId);
  if (!provider.enabled || !provider.apiKey) throw new Error("AUDIO_PROVIDER_NOT_CONFIGURED");
  return {
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    model: provider.model,
    timeoutMs: provider.timeoutMs,
    maxRetries: provider.maxRetries,
    webhookUrl: (await getAudioWebhookUrl(providerId)) ?? undefined,
    maxPollingMinutes: provider.maxPollingMinutes,
  };
}

/**
 * Submits the jobs of one song group to the provider they were created for. Musicful jobs keep the
 * historical path; any other provider is driven through its adapter (one task id per version).
 */
export async function submitSongGroupJobsForProvider(jobIds: string[]): Promise<{ succeeded: number; failed: number }> {
  if (!jobIds.length) return { succeeded: 0, failed: 0 };
  const database = getServiceDb();
  const jobs = await database.select().from(musicGenerationJobs).where(inArray(musicGenerationJobs.id, jobIds));
  const ordered = jobIds.map((id) => jobs.find((job) => job.id === id)).filter((job): job is JobRow => Boolean(job));
  const [primary] = ordered;
  if (!primary) return { succeeded: 0, failed: 0 };
  if (getAudioProviderDefinition(primary.provider).id === "musicful") return submitSongGroupJobs(jobIds);

  const adapter = getAudioAdapter(primary.provider);
  if (!adapter) throw new Error(`AUDIO_PROVIDER_NOT_IMPLEMENTED:${primary.provider}`);
  const config = await loadRuntimeConfig(primary.provider);
  const failAll = async (failureReason: string, responsePayload?: unknown) => {
    await Promise.all(
      ordered.map((job) =>
        database
          .update(musicGenerationJobs)
          .set({
            status: "failed",
            failureReason,
            responsePayload: responsePayload ?? null,
            failedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(musicGenerationJobs.id, job.id)),
      ),
    );
    return { succeeded: 0, failed: ordered.length };
  };
  await Promise.all(
    ordered.map((job) =>
      database
        .update(musicGenerationJobs)
        .set({ status: "submitting", startedAt: new Date(), updatedAt: new Date() })
        .where(eq(musicGenerationJobs.id, job.id)),
    ),
  );
  let result;
  try {
    result = await adapter.submit(
      {
        title: primary.title,
        lyrics: primary.lyrics,
        style: primary.style,
        instrumental: primary.instrumental,
        gender: (primary.gender as "male" | "female" | "" | null) ?? null,
        versionCount: ordered.length,
      },
      config,
    );
  } catch (error) {
    logger.error("Audio provider submission failed", {
      provider: primary.provider,
      error: error instanceof Error ? error.message : "unknown",
    });
    return failAll(
      `submission_failed${error instanceof Error && error.message ? `: ${error.message.slice(0, 200)}` : ""}`,
    );
  }
  let succeeded = 0;
  await Promise.all(
    ordered.map((job, index) => {
      const providerTaskId = result.taskIds[index];
      if (providerTaskId) {
        succeeded += 1;
        return database
          .update(musicGenerationJobs)
          .set({ providerTaskId, status: "processing", responsePayload: result.raw ?? null, updatedAt: new Date() })
          .where(eq(musicGenerationJobs.id, job.id));
      }
      return database
        .update(musicGenerationJobs)
        .set({
          status: "failed",
          failureReason: `${primary.provider}_task_id_missing`,
          responsePayload: result.raw ?? null,
          failedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(musicGenerationJobs.id, job.id));
    }),
  );
  return { succeeded, failed: ordered.length - succeeded };
}

/** Advances one job by polling the provider it belongs to (Musicful path unchanged). */
export async function pollJobForProvider(jobId: string, userId: string) {
  const job = await getJobForUser(jobId, userId);
  if (getAudioProviderDefinition(job.provider).id === "musicful") return pollMusicJob(jobId, userId);
  if (job.status === "completed" || job.status === "failed" || job.status === "cancelled" || !job.providerTaskId)
    return job;

  const adapter = getAudioAdapter(job.provider);
  if (!adapter) return job;
  const database = getServiceDb();
  try {
    const config = await loadRuntimeConfig(job.provider);
    const task = await adapter.getTask(job.providerTaskId, config);
    const isFailed = task.state === "failed";
    const mp3: Mp3Resolution =
      task.state === "completed" && task.audioUrl
        ? await ensureVerifiedMp3(task.audioUrl, job.id)
        : { url: null, mimeType: null, normalized: false, reason: "audio_not_ready" };
    const isCompleted = !isFailed && Boolean(mp3.url);
    // Same guard as the Musicful flow: a job whose audio never verifies must not poll forever.
    const elapsedMinutes = (Date.now() - (job.startedAt ?? job.createdAt).getTime()) / 60_000;
    const isTimedOut = !isCompleted && !isFailed && elapsedMinutes > config.maxPollingMinutes;
    const values = {
      providerSongId: task.providerSongId ?? job.providerSongId,
      title: job.title || task.title || null,
      style: task.style || job.style,
      durationSeconds: task.durationSeconds ?? job.durationSeconds,
      audioUrl: isCompleted ? mp3.url : job.audioUrl,
      audioMimeType: isCompleted ? mp3.mimeType : job.audioMimeType,
      audioNormalized: isCompleted ? mp3.normalized : job.audioNormalized,
      coverUrl: job.coverUrl || task.coverUrl || null,
      responsePayload: task.raw ?? job.responsePayload,
      status: isCompleted
        ? ("completed" as const)
        : isFailed || isTimedOut
          ? ("failed" as const)
          : ("processing" as const),
      failureCode: isFailed ? (task.failureCode ?? null) : job.failureCode,
      failureReason: isFailed
        ? task.failureReason || "provider_task_failed"
        : isTimedOut
          ? `audio_verification_timeout:${mp3.reason ?? "unknown"}`
          : job.failureReason,
      completedAt: isCompleted ? new Date() : job.completedAt,
      failedAt: isFailed || isTimedOut ? new Date() : job.failedAt,
      updatedAt: new Date(),
    };
    await database
      .update(musicGenerationJobs)
      .set(values)
      .where(and(eq(musicGenerationJobs.id, job.id), eq(musicGenerationJobs.userId, userId)));
    if (isCompleted && mp3.normalized) {
      await writeAuditLog({
        action: `${job.provider}.audio.normalized_to_mp3`,
        actorId: userId,
        targetType: "music_generation_job",
        targetId: job.id,
      });
    }
    return { ...job, ...values };
  } catch (error) {
    logger.error("Audio provider task poll failed", {
      jobId: job.id,
      provider: job.provider,
      error: error instanceof Error ? error.message : "unknown",
    });
    return job;
  }
}
