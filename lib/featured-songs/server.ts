import "server-only";

import { getServiceDb } from "@/db";
import { landingSongFeatures } from "@/db/schema";
import { LANDING_SONG_FEATURE_SECTION_LABELS, type LandingSongFeatureSection } from "@/lib/landing-features/admin";
import { getTrendingSettings } from "@/lib/trending/settings";
import { mergeSongPlacements, TRENDING_PLACEMENT_LABEL, type SongPlacements } from "./placements";

/** Chansons déjà placées sur la landing (« Ils ont créé avec MusikPro », « Bibliothèque populaire »). */
export async function getLandingSongPlacements(): Promise<SongPlacements> {
  const rows = await getServiceDb()
    .select({ songGroupId: landingSongFeatures.songGroupId, section: landingSongFeatures.section })
    .from(landingSongFeatures);
  return mergeSongPlacements(
    rows.map((row) => ({
      songGroupId: row.songGroupId,
      label: LANDING_SONG_FEATURE_SECTION_LABELS[row.section as LandingSongFeatureSection] ?? row.section,
    })),
    [],
  );
}

/** Chansons déjà choisies pour le widget « Tendances » du tableau de bord client. */
export async function getTrendingSongPlacements(): Promise<SongPlacements> {
  const { manualSelection } = await getTrendingSettings();
  return mergeSongPlacements([], manualSelection);
}

/** Toutes les chansons déjà mises en avant, landing et Tendances confondues. */
export async function getFeaturedSongPlacements(): Promise<SongPlacements> {
  const [landing, trending] = await Promise.all([getLandingSongPlacements(), getTrendingSongPlacements()]);
  return { ...trending, ...landing };
}

export { TRENDING_PLACEMENT_LABEL };
