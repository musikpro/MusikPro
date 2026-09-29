/**
 * Contract a song-generation provider has to fulfil to be usable by MusikPro, independently of its
 * own API shape. Musicful keeps its historical, richer flow (lib/ai/music-jobs.ts); every other
 * provider goes through this adapter (see dispatch.ts).
 */
export type AudioProviderRuntimeConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  /** Public HTTPS callback URL (with secret token) when the provider supports webhooks and one is set up. */
  webhookUrl?: string;
};

export type AudioSubmitInput = {
  title: string | null;
  lyrics: string | null;
  style: string | null;
  instrumental: boolean;
  gender: "male" | "female" | "" | null;
  /** How many versions (independent songs) MusikPro wants for this generation. */
  versionCount: number;
};

export type AudioSubmitResult = {
  /** One provider task id per version, in order. Fewer ids than `versionCount` = the rest fail. */
  taskIds: string[];
  /** Raw provider response, kept on the job for diagnostics. */
  raw: unknown;
};

export type AudioTaskSnapshot = {
  state: "processing" | "completed" | "failed";
  /** Direct URL of the finished audio (any format: MusikPro verifies/transcodes it to MP3 itself). */
  audioUrl?: string | null;
  coverUrl?: string | null;
  durationSeconds?: number | null;
  providerSongId?: string | null;
  title?: string | null;
  style?: string | null;
  failureCode?: number | null;
  failureReason?: string | null;
  raw?: unknown;
};

export type AudioConnectionInfo = {
  /** Free-form account details shown in the admin after a successful test (credits, email...). */
  summary?: string;
};

export interface AudioProviderAdapter {
  readonly id: string;
  submit(input: AudioSubmitInput, config: AudioProviderRuntimeConfig): Promise<AudioSubmitResult>;
  getTask(taskId: string, config: AudioProviderRuntimeConfig): Promise<AudioTaskSnapshot>;
  /** Optional: validates the key/URL for the admin "Tester la connexion" button. */
  testConnection?(config: AudioProviderRuntimeConfig): Promise<AudioConnectionInfo>;
}

export class AudioProviderNotImplementedError extends Error {
  constructor(providerId: string) {
    super(`AUDIO_PROVIDER_NOT_IMPLEMENTED:${providerId}`);
    this.name = "AudioProviderNotImplementedError";
  }
}
