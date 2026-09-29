import "server-only";
import {
  type AudioConnectionInfo,
  type AudioProviderAdapter,
  type AudioProviderRuntimeConfig,
  type AudioSubmitInput,
  type AudioSubmitResult,
  type AudioTaskSnapshot,
} from "./types";

/**
 * MusicGPT adapter (skill: .agents/skills/musicgpt-saas-integration-SKILL.md).
 * Generation goes through Music AI V2 (`POST /v2/MusicAI`), which returns two variants
 * (`conversion_id_1/2`); each variant is followed as its own task through `GET /v1/byId`.
 * Only the MP3 (`conversion_path`) is ever used: `conversion_path_wav` is ignored.
 * The webhook (app/api/webhooks/musicgpt/[token]) only triggers an immediate poll; the shared job
 * poller stays the fallback, so nothing depends on the webhook being delivered.
 */
const MODELS = new Set(["v6", "v6-pro", "v7", "v7-pro"]);
const MAX_PROMPT_CHARS = 1_000;
const MAX_STYLE_CHARS = 300;
const MAX_LYRICS_CHARS = 5_000;

export class MusicGptApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MusicGptApiError";
  }
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const asString = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

async function request(path: string, config: AudioProviderRuntimeConfig, init: RequestInit = {}) {
  const base = config.baseUrl.replace(/\/+$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Authorization: config.apiKey,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      signal: controller.signal,
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
      // The provider's own message (never the request, so no secret) makes failures diagnosable.
      const record = asRecord(data);
      const detail =
        asString(record?.error) ?? asString(record?.message) ?? asString(record?.detail) ?? text.slice(0, 200);
      throw new MusicGptApiError(`MusicGPT HTTP ${response.status}${detail ? `: ${detail}` : ""}`, response.status);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

/** Cuts at a word boundary so a long style prompt never exceeds MusicGPT's field limits. */
function clip(value: string | null | undefined, max: number) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), Math.floor(max * 0.6))).trim();
}

/** Finds the object carrying the conversion fields, whichever wrapper the API uses. */
function findConversion(payload: unknown): Record<string, unknown> | null {
  const queue: unknown[] = [payload];
  for (let depth = 0; depth < 3 && queue.length; depth += 1) {
    const next: unknown[] = [];
    for (const item of queue) {
      const record = asRecord(item);
      if (!record) continue;
      if ("conversion_path" in record || "status" in record || "audio_url" in record) return record;
      next.push(...Object.values(record));
    }
    queue.length = 0;
    queue.push(...next);
  }
  return null;
}

export const musicGptAudioAdapter: AudioProviderAdapter = {
  id: "musicgpt",

  async submit(input: AudioSubmitInput, config: AudioProviderRuntimeConfig): Promise<AudioSubmitResult> {
    const model = MODELS.has(config.model) ? config.model : "v7";
    const lyrics = clip(input.lyrics, MAX_LYRICS_CHARS);
    const style = clip(input.style, MAX_PROMPT_CHARS);
    const payload: Record<string, unknown> = {
      prompt: style || undefined,
      title: input.title ? clip(input.title, 200) : undefined,
      music_style: style ? clip(style, MAX_STYLE_CHARS) : undefined,
      lyrics: lyrics && !input.instrumental ? input.lyrics!.slice(0, MAX_LYRICS_CHARS) : undefined,
      make_instrumental: input.instrumental,
      gender: input.gender || undefined,
      generate_album_cover: true,
      model,
      webhook_url: config.webhookUrl || undefined,
    };
    const raw = await request("/v2/MusicAI", config, { method: "POST", body: JSON.stringify(payload) });
    const record = asRecord(raw) ?? {};
    const taskIds = [asString(record.conversion_id_1), asString(record.conversion_id_2)].filter((id): id is string =>
      Boolean(id),
    );
    return { taskIds, raw };
  },

  async getTask(conversionId: string, config: AudioProviderRuntimeConfig): Promise<AudioTaskSnapshot> {
    const raw = await request(
      `/v1/byId?${new URLSearchParams({ conversion_id: conversionId, conversionType: "MUSIC_AI" })}`,
      config,
    );
    const conversion = findConversion(raw);
    if (!conversion) return { state: "processing", raw };
    const status = (asString(conversion.status) ?? "").toLowerCase();
    // One task holds both variants: fields are suffixed `_1` / `_2`, chosen by which conversion id we follow.
    const variant = conversion.conversion_id_2 === conversionId ? 2 : 1;
    // Only the MP3 is used; the WAV fields (`conversion_path_wav_n`) are deliberately never read.
    // A variant is usable as soon as its own MP3 exists, even while the other one (and the task) is still running.
    const audioUrl =
      asString(conversion[`conversion_path_${variant}`]) ??
      asString(conversion.conversion_path) ??
      asString(conversion.audio_url);
    const failed = !audioUrl && /fail|error|reject|cancel/.test(status);
    return {
      state: audioUrl ? "completed" : failed ? "failed" : "processing",
      audioUrl,
      coverUrl: asString(conversion.album_cover_path) ?? asString(conversion.cover_url),
      durationSeconds:
        Math.round(asNumber(conversion[`conversion_duration_${variant}`]) ?? asNumber(conversion.duration) ?? 0) ||
        null,
      providerSongId: conversionId,
      title: asString(conversion[`title_${variant}`]) ?? asString(conversion.title),
      failureReason: failed
        ? (asString(conversion.message) ?? asString(conversion.error) ?? "musicgpt_task_failed")
        : null,
      raw: conversion,
    };
  },

  async testConnection(config: AudioProviderRuntimeConfig): Promise<AudioConnectionInfo> {
    await request("/v1/getAllVoices?page=0&limit=1", config);
    return { summary: "Clé MusicGPT valide" };
  },
};
