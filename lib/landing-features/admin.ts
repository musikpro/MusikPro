import "server-only";

import { asc, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { landingSongFeatures, musicGenerationJobs, songPublications } from "@/db/schema";

export type LandingSongFeatureSection = "showcase" | "library";
export const LANDING_SONG_FEATURE_SECTIONS = ["showcase", "library"] as const;
export const MAX_LANDING_SONG_FEATURES_PER_SECTION = 4;

export type LandingSongFeatureRow = {
  id: string;
  songGroupId: string;
  coverUrlOverride: string | null;
  sortOrder: number;
  songTitle: string;
  songSlug: string;
};

/** Every slot currently assigned to one landing section, for the admin grid — see /admin/landing-features. */
export async function listLandingSongFeatures(section: LandingSongFeatureSection): Promise<LandingSongFeatureRow[]> {
  const rows = await getServiceDb()
    .select({
      id: landingSongFeatures.id,
      songGroupId: landingSongFeatures.songGroupId,
      coverUrlOverride: landingSongFeatures.coverUrlOverride,
      sortOrder: landingSongFeatures.sortOrder,
      songTitle: musicGenerationJobs.title,
      songSlug: songPublications.slug,
    })
    .from(landingSongFeatures)
    .innerJoin(songPublications, eq(songPublications.songGroupId, landingSongFeatures.songGroupId))
    .innerJoin(musicGenerationJobs, eq(musicGenerationJobs.id, songPublications.jobId))
    .where(eq(landingSongFeatures.section, section))
    .orderBy(asc(landingSongFeatures.sortOrder));
  return rows.map((row) => ({ ...row, songTitle: row.songTitle || "Chanson MusikPro" }));
}
