import "server-only";

import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs, songPublications } from "@/db/schema";
import { extractGenreLabel } from "@/lib/ai/songs";
import { getTrendingSettings } from "./settings";
import { getDisplayLimits } from "@/lib/settings/display-limits";
import { truncateTitle } from "@/lib/settings/display-limits-constants";
import { TRENDING_COUNT } from "./types";

export type TrendingSong = {
  slug: string;
  title: string;
  /** Titre coupé à la longueur réglée dans /admin/trending (« … » au bout) ; `title` reste complet. */
  displayTitle: string;
  plays: number;
  coverUrl: string | null;
  style: string | null;
  occasion: string | null;
  /** Published MP3 of this song — lets the client dashboard play it in its own internal player. */
  audioUrl: string | null;
};

async function manualPool(
  songGroupIds: string[],
  covers: Record<string, string>,
  titleMaxChars: number,
): Promise<TrendingSong[]> {
  if (songGroupIds.length === 0) return [];
  const database = getServiceDb();
  const rows = await database
    .select({
      songGroupId: songPublications.songGroupId,
      slug: songPublications.slug,
      title: musicGenerationJobs.title,
      plays: musicGenerationJobs.plays,
      coverUrl: musicGenerationJobs.coverUrl,
      style: musicGenerationJobs.style,
      occasion: musicGenerationJobs.occasion,
      audioUrl: musicGenerationJobs.audioUrl,
    })
    .from(songPublications)
    .innerJoin(musicGenerationJobs, eq(musicGenerationJobs.id, songPublications.jobId))
    .where(eq(musicGenerationJobs.status, "completed"));
  const bySongGroupId = new Map(rows.map((row) => [row.songGroupId, row]));
  return songGroupIds
    .map((id) => bySongGroupId.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => ({
      slug: row.slug,
      title: row.title || "Chanson MusikPro",
      displayTitle: truncateTitle(row.title || "Chanson MusikPro", titleMaxChars),
      plays: row.plays,
      coverUrl: covers[row.songGroupId] ?? null,
      style: extractGenreLabel(row.style),
      occasion: row.occasion,
      audioUrl: row.audioUrl,
    }));
}

/**
 * Songs shown in the "Tendances" widget of the client dashboard (see
 * components/banani/UserDashboardDesktop.tsx and UserDashboardMobile.tsx): exactly the songs the
 * owner picked by hand in /admin/trending (two cards at most, in that order), each with the cover
 * chosen from the media library. There is no automatic ranking any more. A song without an
 * assigned cover falls back to the MusikPro logo card.
 */
export async function getTrendingSongs(): Promise<TrendingSong[]> {
  try {
    const settings = await getTrendingSettings();
    const { trendingTitleMaxChars } = await getDisplayLimits();
    const pool = await manualPool(settings.manualSelection, settings.coverOverrides, trendingTitleMaxChars);
    return pool.slice(0, TRENDING_COUNT);
  } catch {
    return [];
  }
}
