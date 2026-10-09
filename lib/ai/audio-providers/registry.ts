import "server-only";
import { getAudioProviderDefinition } from "./catalog";
import { musicGptAudioAdapter } from "./musicgpt";
import { replicateAudioAdapter } from "./replicate";
import type { AudioProviderAdapter } from "./types";

/**
 * Adapters of the providers that go through the generic flow (dispatch.ts). Musicful is not listed:
 * it keeps its dedicated, richer implementation in lib/ai/music-jobs.ts.
 * Register a new provider's adapter here, next to its entry in catalog.ts.
 */
const adapters: Record<string, AudioProviderAdapter> = {
  musicgpt: musicGptAudioAdapter,
  replicate: replicateAudioAdapter,
};

export function getAudioAdapter(providerId: string): AudioProviderAdapter | null {
  return adapters[getAudioProviderDefinition(providerId).id] ?? null;
}
