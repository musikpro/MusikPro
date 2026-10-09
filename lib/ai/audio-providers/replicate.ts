import "server-only";
import { createHash } from "node:crypto";
import {
  type AudioConnectionInfo,
  type AudioProviderAdapter,
  type AudioProviderRuntimeConfig,
  type AudioSubmitInput,
  type AudioSubmitResult,
  type AudioTaskSnapshot,
} from "./types";
import {
  REPLICATE_API_BASE,
  REPLICATE_MODEL,
  buildReplicateInput,
  isReplicatePredictionId,
  pickReplicateOutputUrl,
  resolveReplicateVersion,
} from "./replicate-model";

/**
 * Replicate adapter (skill: .claude/skills/Replicate-MusikPro-MP3-SKILL.md), model `fishaudio/ace-step-1.5`.
 * - Asynchronous predictions only: one prediction per requested version (`batch_size` 1), so every version
 *   is its own MusikPro job. A POST is never retried here: after a timeout Replicate may still have accepted
 *   it, and a blind retry would create a second billable song.
 * - Output is MP3 only (`audio_format: "mp3"` is forced in replicate-model.ts) and the delivery link is
 *   temporary, hence `persistAudio` (dispatch copies the file to durable storage).
 * - The API host is fixed: `config.baseUrl` is ignored, the key is only ever sent to api.replicate.com.
 */
export class ReplicateApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ReplicateApiError";
  }
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const asString = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

export async function replicateRequest(path: string, config: AudioProviderRuntimeConfig, init: RequestInit = {}) {
  const response = await fetch(`${REPLICATE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    redirect: "error",
    signal: AbortSignal.timeout(config.timeoutMs),
    cache: "no-store",
  });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    // Provider's own `detail` only (never the request, so never the key).
    const detail = asString(asRecord(data)?.detail) ?? "";
    throw new ReplicateApiError(
      `Replicate HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      response.status,
    );
  }
  return data;
}

export const replicateAudioAdapter: AudioProviderAdapter = {
  id: "replicate",

  async submit(input: AudioSubmitInput, config: AudioProviderRuntimeConfig): Promise<AudioSubmitResult> {
    const version = resolveReplicateVersion(config.model);
    const body = JSON.stringify({
      version: `${REPLICATE_MODEL}:${version}`,
      input: buildReplicateInput({ lyrics: input.lyrics, style: input.style, instrumental: input.instrumental }),
      ...(config.webhookUrl ? { webhook: config.webhookUrl, webhook_events_filter: ["completed"] } : {}),
    });
    const count = Math.min(Math.max(input.versionCount, 1), 3);
    const results = await Promise.allSettled(
      Array.from({ length: count }, () => replicateRequest("/predictions", config, { method: "POST", body })),
    );
    const taskIds: string[] = [];
    const raws: unknown[] = [];
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const id = asRecord(result.value)?.id;
      if (isReplicatePredictionId(id)) {
        taskIds.push(id);
        raws.push({ id, status: asRecord(result.value)?.status ?? null });
      }
    }
    if (!taskIds.length) {
      const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
      throw failure?.reason instanceof Error
        ? failure.reason
        : new ReplicateApiError("Replicate: no prediction id", 502);
    }
    return { taskIds, raw: raws };
  },

  async getTask(predictionId: string, config: AudioProviderRuntimeConfig): Promise<AudioTaskSnapshot> {
    if (!isReplicatePredictionId(predictionId)) {
      return { state: "failed", failureReason: "replicate_invalid_prediction_id" };
    }
    const prediction = asRecord(await replicateRequest(`/predictions/${predictionId}`, config));
    if (!prediction) return { state: "processing" };
    const status = (asString(prediction.status) ?? "").toLowerCase();
    // Diagnostics worth keeping on the job; the prompt, lyrics and temporary links are deliberately left out.
    const raw = {
      id: predictionId,
      status,
      model: asString(prediction.model),
      version: asString(prediction.version),
      metrics: asRecord(prediction.metrics),
      created_at: asString(prediction.created_at),
      completed_at: asString(prediction.completed_at),
    };
    if (status === "succeeded") {
      const audioUrl = pickReplicateOutputUrl(prediction.output);
      if (!audioUrl) return { state: "failed", failureReason: "replicate_invalid_output", raw };
      const duration = asRecord(prediction.input)?.duration;
      return {
        state: "completed",
        audioUrl,
        persistAudio: true,
        providerSongId: predictionId,
        durationSeconds: typeof duration === "number" && duration > 0 ? Math.round(duration) : null,
        raw,
      };
    }
    if (status === "failed" || status === "canceled" || status === "aborted") {
      const error = asString(prediction.error);
      return { state: "failed", failureReason: `replicate_${status}${error ? `: ${error.slice(0, 160)}` : ""}`, raw };
    }
    return { state: "processing", raw };
  },

  async testConnection(config: AudioProviderRuntimeConfig): Promise<AudioConnectionInfo> {
    // Free call: validates the key without starting a (billable) prediction.
    const account = asRecord(await replicateRequest("/account", config));
    const username = asString(account?.username);
    const type = asString(account?.type);
    return { summary: `Compte Replicate${username ? ` ${username}` : ""}${type ? ` (${type})` : ""}` };
  },
};

const secretCache = new Map<string, { secret: string; expiresAt: number }>();
const SECRET_TTL_MS = 10 * 60_000;

/**
 * Signing secret of the Replicate account (`whsec_…`), read from the API and kept in memory only (never
 * stored, never sent to the browser). Keyed by a hash of the API key, so replacing the key refreshes it.
 * `force` bypasses the cache once, after a signature failure that may come from a rotated secret.
 */
export async function getReplicateWebhookSecret(config: AudioProviderRuntimeConfig, force = false): Promise<string> {
  const cacheKey = createHash("sha256").update(config.apiKey).digest("hex");
  const cached = secretCache.get(cacheKey);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.secret;
  const key = asString(asRecord(await replicateRequest("/webhooks/default/secret", config))?.key);
  if (!key) throw new ReplicateApiError("Replicate: webhook secret unavailable", 502);
  secretCache.set(cacheKey, { secret: key, expiresAt: Date.now() + SECRET_TTL_MS });
  return key;
}
