import "server-only";
import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { audioProviderConfigs } from "@/db/schema";
import { decryptSecret } from "./secrets";
import { MusicfulApiError } from "./errors";

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
  // MusikPro never exposes video output; see .agents/skills/Musicful-v2-MP3-Only-SKILL.md.
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

export async function getMusicfulProvider() {
  const [stored] = await getServiceDb()
    .select()
    .from(audioProviderConfigs)
    .where(eq(audioProviderConfigs.provider, "musicful"))
    .limit(1);
  const apiKey =
    stored?.apiKeyCiphertext && stored.apiKeyIv && stored.apiKeyAuthTag
      ? decryptSecret({ ciphertext: stored.apiKeyCiphertext, iv: stored.apiKeyIv, authTag: stored.apiKeyAuthTag })
      : process.env.MUSICFUL_API_KEY;
  return {
    config: stored,
    apiKey,
    enabled: stored ? stored.enabled : Boolean(apiKey),
    baseUrl: stored?.apiBaseUrl || "https://api.musicful.ai",
    model: stored?.defaultModel || "MFV3.0",
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
  };
}

/**
 * Narrow, secret-free read of just the configured version count — safe to thread down into
 * client-facing props (unlike getMusicfulProvider(), which decrypts the API key).
 */
export async function getMusicfulVersionsPerGeneration(): Promise<number> {
  const [stored] = await getServiceDb()
    .select({ versionsPerGeneration: audioProviderConfigs.versionsPerGeneration })
    .from(audioProviderConfigs)
    .where(eq(audioProviderConfigs.provider, "musicful"))
    .limit(1);
  return stored?.versionsPerGeneration ?? 1;
}

export function createMusicfulClient(apiKey: string, baseUrl?: string, timeoutMs?: number) {
  return new MusicfulClient(apiKey, baseUrl, timeoutMs);
}
