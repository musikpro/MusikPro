import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs } from "@/db/schema";
import { createMusicfulClient, getMusicfulProvider, MusicfulApiError, type MusicfulClient } from "./musicful";
import { musicfulTasksSchema, type MusicfulGenerateRequest } from "@/lib/validation/ai";
import { createLogger } from "@/lib/observability/logger";
import { isCloudinaryConfigured, transcodeRemoteAudioToMp3 } from "@/lib/storage/cloudinary";
import { writeAuditLog } from "@/lib/security/audit";

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

/**
 * Musicful reports request-validation failures (e.g. a `style` string over its length limit)
 * as HTTP 200 with `{ data: {}, status: 400000, message: "Invalid request parameter, ..." }`
 * rather than a non-2xx status — `MusicfulClient.request` only throws on HTTP failure, so this
 * envelope-level error previously fell through to the generic "no task id" branch below and
 * `failureReason` recorded "MUSICFUL_TASK_ID_MISSING" instead of the real, actionable message.
 */
function extractGenerateErrorMessage(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const message = (response as Record<string, unknown>).message;
  return typeof message === "string" && message.trim() ? message.trim() : null;
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

/**
 * Musicful only sings lyrics submitted through "custom" mode — "auto" ignores any lyrics
 * field entirely and improvises its own, which is why generated audio used to be a
 * completely different song from what the user wrote. This picks the mode that actually
 * matches what the job has.
 */
function callMusicfulGenerate(
  client: MusicfulClient,
  job: Pick<JobRow, "lyrics" | "title" | "style" | "model" | "instrumental" | "gender">,
) {
  const gender = (job.gender as "male" | "female" | "" | null) || undefined;
  const instrumental: 0 | 1 = job.instrumental ? 1 : 0;
  if (job.lyrics && !job.instrumental) {
    return client.generateMusicCustom({ lyrics: job.lyrics, title: job.title, style: job.style, mv: job.model, instrumental, gender });
  }
  return client.generateMusicAuto({ style: job.style, mv: job.model, instrumental, gender });
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
    response = await callMusicfulGenerate(client, job);
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
    const providerMessage = extractGenerateErrorMessage(response);
    const failureReason = providerMessage ? `musicful_rejected: ${providerMessage}` : "MUSICFUL_TASK_ID_MISSING";
    logger.error("Musicful generate response had no extractable task id", { jobId, response });
    await database
      .update(musicGenerationJobs)
      .set({ status: "failed", failureReason, responsePayload: response, failedAt: new Date(), updatedAt: new Date() })
      .where(eq(musicGenerationJobs.id, jobId));
    throw new Error(failureReason);
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
    response = await callMusicfulGenerate(client, primary);
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
  const providerMessage = extractGenerateErrorMessage(response);
  const missingIdFailureReason = providerMessage ? `musicful_rejected: ${providerMessage}` : "MUSICFUL_TASK_ID_MISSING";
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
        .set({ status: "failed", failureReason: missingIdFailureReason, responsePayload: response, failedAt: new Date(), updatedAt: new Date() })
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
 * non-empty, this fetches a byte range and reports what it actually serves.
 */
async function probeMediaUrl(url: string): Promise<{ ok: boolean; contentType: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1023" }, signal: controller.signal });
    return { ok: response.ok, contentType: response.headers.get("content-type") || "" };
  } catch {
    return { ok: false, contentType: "" };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * MusikPro is audio-only, but Musicful's finished file isn't consistently labeled: a live
 * account confirms the exact same account can get back `audio/mpeg` for one song and
 * `video/mp4` for another — and Musicful's `/v1/music/generate` has no request parameter to
 * force an audio-only response (checked against their official docs). Since we can't ask for
 * audio at generation time, this guarantees it after the fact via their WAV conversion
 * endpoint (confirmed live: synchronous, ~6s, returns a genuine `audio/x-wav` file):
 * conversion runs whenever the native file isn't audio-typed at all (a `video/mp4` labeling
 * quirk), or whenever the admin's "preferred audio format" setting asks for WAV on every
 * song regardless of what Musicful natively returned. Falls back to the native file when
 * conversion isn't needed, isn't possible (disabled by an admin, no song_id yet), or fails,
 * so a real finished song is never stuck "processing" forever over a labeling quirk — the
 * fallback only ever surfaces a video-typed file when an admin has explicitly turned WAV
 * conversion off.
 */
type AudioUrlResolution = { url: string; reason: null } | { url: null; reason: string };

async function resolveAudioOnlyUrl(
  client: MusicfulClient,
  candidateUrl: string,
  songId: string | null | undefined,
  allowWavConversion: boolean,
  preferredFormat: "native" | "wav",
  jobId: string,
): Promise<AudioUrlResolution> {
  const probe = await probeMediaUrl(candidateUrl);
  if (!probe.ok) return { url: null, reason: "musicful_audio_url_unreachable" };
  const isNativeAudio = probe.contentType.startsWith("audio/");
  const isNativeVideo = probe.contentType.startsWith("video/");
  if (!isNativeAudio && !isNativeVideo) {
    return { url: null, reason: `musicful_unexpected_content_type:${probe.contentType || "unknown"}` };
  }

  const wantsWavConversion = isNativeVideo || preferredFormat === "wav";
  if (wantsWavConversion && allowWavConversion && songId) {
    try {
      const wav = await client.convertToWav(songId);
      if (wav.url) return { url: wav.url, reason: null };
    } catch (error) {
      logger.error("Musicful WAV conversion failed", {
        jobId,
        songId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }
  return { url: candidateUrl, reason: null };
}

const VERIFIED_MP3_CONTENT_TYPES = new Set(["audio/mpeg", "audio/mp3", "audio/x-mpeg"]);

/**
 * Musicful v2 — MP3 Only golden rule: never expose anything but a genuine MP3 to the user.
 * `resolveAudioOnlyUrl` above only guarantees an *audio*-typed file (native or WAV); this
 * verifies the real content-type and — since no ffmpeg runtime exists in this Vercel
 * deployment — hands off to Cloudinary (already used for image uploads) to transcode
 * whenever the source isn't already MP3. Returns null (job stays "processing" and retries on
 * the next poll) when the source can't be verified or Cloudinary isn't configured, so a
 * non-MP3 file is never silently relabeled or exposed as final.
 */
export type Mp3Resolution =
  | { url: string; mimeType: "audio/mpeg"; normalized: boolean; reason: null }
  | { url: null; mimeType: null; normalized: false; reason: string };

export async function ensureVerifiedMp3(candidateUrl: string, jobId: string): Promise<Mp3Resolution> {
  const probe = await probeMediaUrl(candidateUrl);
  if (!probe.ok) return { url: null, mimeType: null, normalized: false, reason: "resolved_audio_url_unreachable" };
  const contentType = probe.contentType.toLowerCase().split(";")[0].trim();
  if (VERIFIED_MP3_CONTENT_TYPES.has(contentType)) {
    return { url: candidateUrl, mimeType: "audio/mpeg", normalized: false, reason: null };
  }
  if (!isCloudinaryConfigured()) {
    logger.error("Musicful audio isn't MP3 and Cloudinary isn't configured; cannot guarantee MP3-only output", { jobId, contentType });
    return { url: null, mimeType: null, normalized: false, reason: "cloudinary_not_configured" };
  }
  try {
    const transcoded = await transcodeRemoteAudioToMp3(candidateUrl, { publicId: `job-${jobId}` });
    return { url: transcoded.url, mimeType: "audio/mpeg", normalized: true, reason: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    logger.error("Musicful MP3 transcoding failed", { jobId, error: message });
    return { url: null, mimeType: null, normalized: false, reason: `cloudinary_transcode_failed:${message}` };
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
    const resolvedAudio: AudioUrlResolution = candidateAudioUrl
      ? await resolveAudioOnlyUrl(client, candidateAudioUrl, task.song_id, provider.allowWavConversion, provider.preferredAudioFormat, job.id)
      : { url: null, reason: "musicful_audio_not_ready" };
    const mp3Result: Mp3Resolution = resolvedAudio.url
      ? await ensureVerifiedMp3(resolvedAudio.url, job.id)
      : { url: null, mimeType: null, normalized: false, reason: resolvedAudio.reason ?? "musicful_audio_not_ready" };
    const isCompleted = !isFailed && Boolean(mp3Result.url);
    // A job whose audio never verifies as MP3 (Cloudinary misconfigured, provider CDN never
    // settling, ...) used to poll "processing" forever — maxPollingMinutes was a configurable
    // admin setting that nothing ever read. This finally enforces it: past the deadline, the job
    // is marked failed with the last diagnostic reason instead of spinning indefinitely.
    const elapsedMinutes = (Date.now() - (job.startedAt ?? job.createdAt).getTime()) / 60_000;
    const isTimedOut = !isCompleted && !isFailed && elapsedMinutes > provider.maxPollingMinutes;
    // Musicful reports `duration` in milliseconds (confirmed against a live completed task:
    // 179614 ≈ a 3-minute song), and -1 while still processing.
    const durationSeconds =
      typeof task.duration === "number" && task.duration > 0 ? Math.round(task.duration / 1000) : job.durationSeconds;
    const values = {
      providerSongId: task.song_id || job.providerSongId,
      title: job.title || task.title,
      style: task.style || job.style,
      durationSeconds,
      audioUrl: isCompleted ? mp3Result.url : job.audioUrl,
      audioMimeType: isCompleted ? mp3Result.mimeType : job.audioMimeType,
      audioNormalized: isCompleted ? mp3Result.normalized : job.audioNormalized,
      coverUrl: task.cover_url || job.coverUrl,
      providerStatus: task.status,
      responsePayload: task,
      status: isCompleted ? ("completed" as const) : isFailed || isTimedOut ? ("failed" as const) : ("processing" as const),
      failureCode: isFailed ? task.fail_code : job.failureCode,
      failureReason: isFailed
        ? task.fail_reason || "provider_task_failed"
        : isTimedOut
          ? `audio_verification_timeout:${mp3Result.reason ?? "unknown"}`
          : job.failureReason,
      completedAt: isCompleted ? new Date() : job.completedAt,
      failedAt: isFailed || isTimedOut ? new Date() : job.failedAt,
      updatedAt: new Date(),
    };
    await database.update(musicGenerationJobs).set(values).where(eq(musicGenerationJobs.id, job.id));
    if (isCompleted && mp3Result?.normalized) {
      await writeAuditLog({
        action: "musicful.audio.normalized_to_mp3",
        actorId: userId,
        targetType: "music_generation_job",
        targetId: job.id,
      });
    }
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

// Musicful v2 — MP3 Only: no MP4-conversion request helper here — MP4 output is never generated.

export async function getJobForUser(jobId: string, userId: string) {
  return getOwnedJob(jobId, userId);
}
