import "server-only";
import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { ambientBackgroundTrack, landingSongFeatures, trendingSettings } from "@/db/schema";
import { LANDING_SONG_FEATURE_SECTION_LABELS, type LandingSongFeatureSection } from "@/lib/landing-features/admin";

/**
 * Where a song is currently displayed by the platform owner's curation — a song shown somewhere
 * must not be deletable, or that spot would silently lose (or break on) its content. Returns the
 * human-readable name of every place, in a stable order; an empty list means the song is free to
 * delete. Only ACTIVE placements count: a disabled ambient track or a Tendances widget in
 * automatic mode isn't displaying the song, so it doesn't block deletion.
 */
export async function findSongGroupUsages(songGroupId: string): Promise<string[]> {
  const database = getServiceDb();
  const usages: string[] = [];

  const featured = await database
    .select({ section: landingSongFeatures.section })
    .from(landingSongFeatures)
    .where(eq(landingSongFeatures.songGroupId, songGroupId));
  for (const section of ["showcase", "library"] as const satisfies readonly LandingSongFeatureSection[]) {
    if (featured.some((row) => row.section === section))
      usages.push(`Landing page — « ${LANDING_SONG_FEATURE_SECTION_LABELS[section]} »`);
  }

  const [trending] = await database
    .select({ mode: trendingSettings.mode, manualSelection: trendingSettings.manualSelection })
    .from(trendingSettings)
    .where(eq(trendingSettings.id, "global"))
    .limit(1);
  if (
    trending?.mode === "manual" &&
    Array.isArray(trending.manualSelection) &&
    (trending.manualSelection as unknown[]).includes(songGroupId)
  )
    usages.push("Tendances (tableau de bord client)");

  const [ambient] = await database
    .select({ enabled: ambientBackgroundTrack.enabled, songGroupId: ambientBackgroundTrack.songGroupId })
    .from(ambientBackgroundTrack)
    .where(eq(ambientBackgroundTrack.id, "global"))
    .limit(1);
  if (ambient?.enabled && ambient.songGroupId === songGroupId) usages.push("Musique d’ambiance");

  return usages;
}
