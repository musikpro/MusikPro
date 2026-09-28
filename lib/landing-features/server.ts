import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { landingSongFeatures, musicGenerationJobs, songPublications } from "@/db/schema";
import { extractGenreLabel } from "@/lib/ai/songs";

export type LandingFeaturedSong = {
  songGroupId: string;
  slug: string;
  title: string;
  plays: number;
  coverUrl: string | null;
  style: string | null;
  occasion: string | null;
  audioUrl: string | null;
};

/**
 * Owner-curated song slots for the public landing page's "Ils ont créé avec MusikPro" (showcase)
 * and "Bibliothèque populaire" (library) sections — set from /admin/landing-features, independent
 * from the dashboard's trendingSettings (lib/trending/server.ts). Real songs only: a slot whose
 * job isn't published/completed anymore simply drops out via the inner joins below, never
 * replaced by placeholder data.
 */
async function loadSection(section: "showcase" | "library"): Promise<LandingFeaturedSong[]> {
  try {
    const rows = await getServiceDb()
      .select({
        songGroupId: landingSongFeatures.songGroupId,
        coverOverride: landingSongFeatures.coverUrlOverride,
        slug: songPublications.slug,
        title: musicGenerationJobs.title,
        plays: musicGenerationJobs.plays,
        coverUrl: musicGenerationJobs.coverUrl,
        style: musicGenerationJobs.style,
        occasion: musicGenerationJobs.occasion,
        audioUrl: musicGenerationJobs.audioUrl,
      })
      .from(landingSongFeatures)
      .innerJoin(songPublications, eq(songPublications.songGroupId, landingSongFeatures.songGroupId))
      .innerJoin(musicGenerationJobs, eq(musicGenerationJobs.id, songPublications.jobId))
      .where(and(eq(landingSongFeatures.section, section), eq(musicGenerationJobs.status, "completed")))
      .orderBy(asc(landingSongFeatures.sortOrder));
    return rows.map((row) => ({
      songGroupId: row.songGroupId,
      slug: row.slug,
      title: row.title || "Chanson MusikPro",
      plays: row.plays,
      coverUrl: row.coverOverride || row.coverUrl,
      style: extractGenreLabel(row.style),
      occasion: row.occasion,
      audioUrl: row.audioUrl,
    }));
  } catch {
    return [];
  }
}

export const getLandingShowcaseSongs = () => loadSection("showcase");
export const getLandingLibrarySongs = () => loadSection("library");
