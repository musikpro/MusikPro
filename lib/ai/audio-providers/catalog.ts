/**
 * Catalog of the song-generation (audio) providers MusikPro can send a generation to.
 *
 * TO PLUG IN A NEW PROVIDER: add an entry here, write its adapter (see types.ts and musicgpt.ts as a
 * reference), register it in registry.ts and flip `implemented` to true. The admin screen
 * (/admin/ai-providers/audio), the per-provider settings row (`audio_provider_configs`, keyed by `id`)
 * and the generation/polling flow (dispatch.ts) all follow this list.
 */
export type AudioProviderDefinition = {
  id: string;
  label: string;
  description: string;
  /** false = only the admin slot exists; generations cannot be routed to it yet. */
  implemented: boolean;
  defaults: {
    apiBaseUrl: string;
    model: string;
    /** Optional env var read when no key is stored in the database (never exposed to the client). */
    envKey?: string;
  };
};

export const AUDIO_PROVIDERS: readonly AudioProviderDefinition[] = [
  {
    id: "musicful",
    label: "Musicful",
    description: "Fournisseur historique : génération de chansons à partir des paroles validées.",
    implemented: true,
    defaults: { apiBaseUrl: "https://api.musicful.ai", model: "MFV3.0", envKey: "MUSICFUL_API_KEY" },
  },
  {
    id: "musicgpt",
    label: "MusicGPT",
    description: "Music AI V2 : génération de chansons (modèles v6, v6-pro, v7, v7-pro), sortie MP3 uniquement.",
    implemented: true,
    defaults: { apiBaseUrl: "https://api.musicgpt.com/api/public", model: "v7", envKey: "MUSICGPT_API_KEY" },
  },
];

export const DEFAULT_AUDIO_PROVIDER_ID = "musicful";

export function getAudioProviderDefinition(id: string | null | undefined): AudioProviderDefinition {
  return AUDIO_PROVIDERS.find((provider) => provider.id === id) ?? AUDIO_PROVIDERS[0];
}

export function isKnownAudioProviderId(id: string): boolean {
  return AUDIO_PROVIDERS.some((provider) => provider.id === id);
}
