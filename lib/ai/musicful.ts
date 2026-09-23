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

  async generateMusicAuto(input: {
    style?: string | null;
    mv: string;
    instrumental: 0 | 1;
    gender?: "male" | "female" | "" | null;
  }) {
    // The documented request only shows `{ task_id }` on success, but third-party APIs in this
    // family commonly wrap responses (`{ data: { task_id } }`, `{ data: [{ task_id }] }`, …); the
    // exact envelope isn't confirmed, so the response is left untyped and extracted defensively
    // by the caller instead of guessing a single shape here.
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

  async getTasks(ids: string | string[]) {
    const idList = Array.isArray(ids) ? ids.join(",") : ids;
    const params = new URLSearchParams({ ids: idList });
    return this.request<MusicfulTask[]>(`/v1/music/tasks?${params}`, { method: "GET" });
  }

  async generateVibe(songId: string) {
    const params = new URLSearchParams({ song_id: songId });
    return this.request<unknown>(`/v1/music/generate-vibe?${params}`, { method: "POST" });
  }

  async convertToWav(songId: string) {
    const params = new URLSearchParams({ song_id: songId });
    return this.request<{ url?: string }>(`/v1/music/generate-wav?${params}`, { method: "POST" });
  }

  async convertToMp4(songId: string) {
    const params = new URLSearchParams({ song_id: songId });
    return this.request<{ url?: string }>(`/v1/music/generate-mp4?${params}`, { method: "POST" });
  }
}

export async function getMusicfulProvider() {
  const [stored] = await getServiceDb().select().from(audioProviderConfigs).where(eq(audioProviderConfigs.provider, "musicful")).limit(1);
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
    allowMp4Conversion: stored?.allowMp4Conversion ?? true,
  };
}

export function createMusicfulClient(apiKey: string, baseUrl?: string, timeoutMs?: number) {
  return new MusicfulClient(apiKey, baseUrl, timeoutMs);
}
