import "server-only";
import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { audioProviderConfigs } from "@/db/schema";
import { tryDecryptSecret } from "./secrets";
import { MusicfulApiError } from "./errors";
import { getAudioProviderDefinition } from "./audio-providers/catalog";
import { getActiveAudioProviderId } from "./audio-providers/active";

export { MusicfulApiError };

export type MusicfulApiKeyInfo = {
  key_status: number;
  key_music_counts: number | string;
  email?: string | null;
  member_id?: string | null;
  key_created_at?: string | null;
  key_updated_at?: string | null;
  key_recently_used_at?: string | null;
  key_name?: string | null;
};

export type MusicfulTask = {
  id: string;
  duration: number;
  status: number;
  title?: string | null;
  style?: string | null;
  audio_url?: string | null;
  cover_url?: string | null;
  song_id?: string | null;
  lyric?: string | null;
  fail_code?: number | null;
  fail_reason?: string | null;
};

export class MusicfulClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(apiKey: string, baseUrl = "https://api.musicful.ai", timeoutMs = 60_000) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          ...(init.headers || {}),
        },
        signal: controller.signal,
        cache: "no-store",
      });
      const text = await response.text();
      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }
      if (!response.ok) {
        throw new MusicfulApiError(`Musicful request failed with HTTP ${response.status}`, response.status, data);
      }
      return data as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getApiKeyInfo() {
    return this.request<MusicfulApiKeyInfo>("/v1/get_api_key_info", { method: "GET" });
  }

  async generateLyrics(prompt: string) {
    return this.request<{ lyrics?: string }>("/v1/lyrics", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
  }

  /**
   * "auto" lets Musicful improvise its own lyrics from just a style/genre description — it has
   * no `lyrics` field, so any lyrics the caller already wrote are never sent. Use this only when
   * there are no user-written lyrics to sing.
   */
  async generateMusicAuto(input: {
    style?: string | null;
    mv: string;
    instrumental: 0 | 1;
    gender?: "male" | "female" | "" | null;
  }) {
    return this.request<unknown>("/v1/music/generate", {
      method: "POST",
      body: JSON.stringify({
        action: "auto",
        style: input.style ?? undefined,
        mv: input.mv,
        instrumental: input.instrumental,
        gender: input.gender || undefined,
      }),
    });
  }

  /**
   * "custom" is Musicful's documented mode for singing the caller's own lyrics (confirmed live:
   * the task's `lyric` field echoes back exactly what was submitted, unlike "auto"). Use this
   * whenever real lyrics exist for the song.
   */
  async generateMusicCustom(input: {
    lyrics: string;
    title?: string | null;
    style?: string | null;
    mv: string;
    instrumental: 0 | 1;
    gender?: "male" | "female" | "" | null;
  }) {
    return this.request<unknown>("/v1/music/generate", {
      method: "POST",
      body: JSON.stringify({
        action: "custom",
        lyrics: input.lyrics,
        title: input.title || undefined,
        style: input.style ?? undefined,
        mv: input.mv,
        instrumental: input.instrumental,
        gender: input.gender || undefined,
      }),
    });
  }

  async getTasks(ids: string | string[]) {
    const idList = Array.isArray(ids) ? ids.join(",") : ids;
    const params = new URLSearchParams({ ids: idList });
    const response = await this.request<unknown>(`/v1/music/tasks?${params}`, { method: "GET" });
    // A live account confirms /v1/music/generate wraps its payload as `{ data, status, message }`
    // rather than returning it bare; /v1/music/tasks follows the same account's response
    // convention, so a bare array is unwrapped from `.data` here instead of assumed.
    if (Array.isArray(response)) return response as MusicfulTask[];
    if (response && typeof response === "object" && Array.isArray((response as Record<string, unknown>).data)) {
      return (response as { data: MusicfulTask[] }).data;
    }
    return [] as MusicfulTask[];
  }

  async generateVibe(songId: string) {
    const params = new URLSearchParams({ song_id: songId });
    return this.request<unknown>(`/v1/music/generate-vibe?${params}`, { method: "POST" });
  }

  /**
   * A live conversion confirms this wraps its payload the same way `/v1/music/generate` and
   * `/v1/music/tasks` do — `{ data: { audio_url }, status, message }` — not a bare `{ url }`.
   */
  async convertToWav(songId: string): Promise<{ url: string | null }> {
    const params = new URLSearchParams({ song_id: songId });
    const response = await this.request<unknown>(`/v1/music/generate-wav?${params}`, { method: "POST" });
    return { url: extractConversionUrl(response) };
  }

  // Musicful v2 — MP3 Only: the MP4/video conversion method is intentionally not implemented —
  // MusikPro never exposes video output; see .claude/skills/Musicful-v2-MP3-Only-SKILL.md.
}

function extractConversionUrl(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const record = response as Record<string, unknown>;
  const direct = record.url ?? record.audio_url;
  if (typeof direct === "string" && direct) return direct;
  const data = record.data;
  if (data && typeof data === "object") {
    const nested = (data as Record<string, unknown>).url ?? (data as Record<string, unknown>).audio_url;
    if (typeof nested === "string" && nested) return nested;
  }
  return null;
}

/**
 * Resolved settings (with the decrypted API key) of one audio provider row. Every provider shares
 * the same `audio_provider_configs` shape; only the defaults (URL, model, env key) differ — see
 * lib/ai/audio-providers/catalog.ts. `getMusicfulProvider()` below keeps the historical name.
 */
export async function getAudioProviderConfig(providerId: string) {
  const definition = getAudioProviderDefinition(providerId);
  const [stored] = await getServiceDb()
    .select()
    .from(audioProviderConfigs)
    .where(eq(audioProviderConfigs.provider, definition.id))
    .limit(1);
  const apiKey =
    stored?.apiKeyCiphertext && stored.apiKeyIv && stored.apiKeyAuthTag
      ? tryDecryptSecret({ ciphertext: stored.apiKeyCiphertext, iv: stored.apiKeyIv, authTag: stored.apiKeyAuthTag })
      : definition.defaults.envKey
        ? process.env[definition.defaults.envKey]
        : undefined;
  return {
    providerId: definition.id,
    config: stored,
    apiKey,
    enabled: stored ? stored.enabled : Boolean(apiKey),
    baseUrl: stored?.apiBaseUrl || definition.defaults.apiBaseUrl,
    model: stored?.defaultModel || definition.defaults.model,
    defaultInstrumental: stored?.defaultInstrumental ?? false,
    defaultGender: (stored?.defaultGender as "male" | "female" | "" | null) ?? "",
    timeoutMs: stored?.requestTimeoutMs ?? 60_000,
    pollingIntervalMs: stored?.pollingIntervalMs ?? 5_000,
    maxPollingMinutes: stored?.maxPollingMinutes ?? 10,
    maxRetries: stored?.maxRetries ?? 2,
    maxGenerationsPerUserPerHour: stored?.maxGenerationsPerUserPerHour ?? 2,
    maxGenerationsPerUserPerDay: stored?.maxGenerationsPerUserPerDay ?? 5,
    allowTextToMusic: stored?.allowTextToMusic ?? true,
    allowLyricsToMusic: stored?.allowLyricsToMusic ?? true,
    allowInstrumental: stored?.allowInstrumental ?? true,
    allowWavConversion: stored?.allowWavConversion ?? true,
    preferredAudioFormat: (stored?.preferredAudioFormat as "native" | "wav" | null) ?? "native",
    strictStyleAdherence: stored?.strictStyleAdherence ?? true,
    versionsPerGeneration: stored?.versionsPerGeneration ?? 1,
    redirectDelaySeconds: stored?.redirectDelaySeconds ?? 180,
    keepExtraGeneratedVariant: stored?.keepExtraGeneratedVariant ?? true,
  };
}

export async function getMusicfulProvider() {
  return getAudioProviderConfig("musicful");
}

/** Settings of the provider that currently receives new generations. */
export async function getActiveAudioProvider() {
  return getAudioProviderConfig(await getActiveAudioProviderId());
}

/**
 * Narrow, secret-free read of just the configured version count — safe to thread down into
 * client-facing props (unlike getMusicfulProvider(), which decrypts the API key).
 */
export async function getMusicfulVersionsPerGeneration(): Promise<number> {
  try {
    const [stored] = await getServiceDb()
      .select({ versionsPerGeneration: audioProviderConfigs.versionsPerGeneration })
      .from(audioProviderConfigs)
      .where(eq(audioProviderConfigs.provider, await getActiveAudioProviderId()))
      .limit(1);
    return stored?.versionsPerGeneration ?? 1;
  } catch {
    return 1;
  }
}

/**
 * Secret-free settings the customer-facing "generation in progress" screen needs: how long to wait
 * for the MP3 before redirecting to "Mes chansons", and how often to ask for its status. Bounds
 * mirror the admin validation so a hand-edited row can never produce a 0s (instant) or endless wait.
 */
export async function getMusicfulGenerationScreenSettings(): Promise<{
  redirectDelaySeconds: number;
  pollingIntervalMs: number;
}> {
  const fallback = { redirectDelaySeconds: 180, pollingIntervalMs: 5_000 };
  try {
    const [stored] = await getServiceDb()
      .select({
        redirectDelaySeconds: audioProviderConfigs.redirectDelaySeconds,
        pollingIntervalMs: audioProviderConfigs.pollingIntervalMs,
      })
      .from(audioProviderConfigs)
      .where(eq(audioProviderConfigs.provider, await getActiveAudioProviderId()))
      .limit(1);
    if (!stored) return fallback;
    return {
      redirectDelaySeconds: Math.min(1_800, Math.max(10, stored.redirectDelaySeconds)),
      pollingIntervalMs: Math.min(15_000, Math.max(2_000, stored.pollingIntervalMs)),
    };
  } catch {
    return fallback;
  }
}

export function createMusicfulClient(apiKey: string, baseUrl?: string, timeoutMs?: number) {
  return new MusicfulClient(apiKey, baseUrl, timeoutMs);
}
