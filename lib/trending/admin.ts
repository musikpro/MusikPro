import "server-only";

import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs, songPublications } from "@/db/schema";
import { extractGenreLabel } from "@/lib/ai/songs";

export type PublishedSongOption = {
  songGroupId: string;
  slug: string;
  title: string;
  styleLabel: string | null;
  plays: number;
};

/**
 * Every publicly published song, platform-wide — feeds the landing-features curator
 * (app/admin/landing-features), which links directly to the public /s/[slug] page, so only
 * already-published songs make sense there. For the Trending picker, which auto-publishes
 * whatever the admin selects, see listRecentGeneratedSongsForAdmin below instead.
 */
export async function listPublishedSongsForAdmin(): Promise<PublishedSongOption[]> {
  const rows = await getServiceDb()
    .select({
      songGroupId: songPublications.songGroupId,
      slug: songPublications.slug,
      title: musicGenerationJobs.title,
      style: musicGenerationJobs.style,
      plays: musicGenerationJobs.plays,
    })
    .from(songPublications)
    .innerJoin(musicGenerationJobs, eq(musicGenerationJobs.id, songPublications.jobId))
    .where(eq(musicGenerationJobs.status, "completed"))
    .orderBy(desc(musicGenerationJobs.plays));
  return rows.map((row) => ({
    songGroupId: row.songGroupId,
    slug: row.slug,
    title: row.title || "Chanson MusikPro",
    styleLabel: extractGenreLabel(row.style),
    plays: row.plays,
  }));
}

export type GeneratedSongOption = {
  songGroupId: string;
  title: string;
  styleLabel: string | null;
  plays: number;
  userId: string;
  jobId: string;
};

/** How many completed jobs to scan (most recent first) before de-duping by song group — matches /admin/generations' own row cap. */
const GENERATED_SONGS_SCAN_LIMIT = 300;

function toGeneratedSongOption(row: {
  id: string;
  userId: string | null;
  songGroupId: string | null;
  title: string | null;
  style: string | null;
  plays: number;
}): GeneratedSongOption | null {
  if (!row.songGroupId || !row.userId) return null;
  return {
    songGroupId: row.songGroupId,
    title: row.title || "Chanson MusikPro",
    styleLabel: extractGenreLabel(row.style),
    plays: row.plays,
    userId: row.userId,
    jobId: row.id,
  };
}

/**
 * Every completed generation platform-wide, one entry per song group (its most recent version
 * stands in for the group) — feeds the Trending manual picker so the admin can feature ANY
 * generated song, published or not, rather than only ones their owner already published. Picking
 * one auto-publishes it on save (see setTrendingSettings), which is why this doesn't require a
 * songPublications row the way listPublishedSongsForAdmin above does.
 */
export async function listRecentGeneratedSongsForAdmin(limit: number): Promise<GeneratedSongOption[]> {
  const rows = await getServiceDb()
    .select({
      id: musicGenerationJobs.id,
      userId: musicGenerationJobs.userId,
      songGroupId: musicGenerationJobs.songGroupId,
      title: musicGenerationJobs.title,
      style: musicGenerationJobs.style,
      plays: musicGenerationJobs.plays,
    })
    .from(musicGenerationJobs)
    .where(and(eq(musicGenerationJobs.status, "completed"), isNotNull(musicGenerationJobs.songGroupId)))
    .orderBy(desc(musicGenerationJobs.createdAt))
    .limit(GENERATED_SONGS_SCAN_LIMIT);
  const bySongGroupId = new Map<string, GeneratedSongOption>();
  for (const row of rows) {
    const option = toGeneratedSongOption(row);
    if (option && !bySongGroupId.has(option.songGroupId)) bySongGroupId.set(option.songGroupId, option);
  }
  return Array.from(bySongGroupId.values()).slice(0, limit);
}

/**
 * Direct lookup by song group ID (the "Identifiant" column shown on /admin/generations) — lets
 * the admin feature a song that isn't among the recent results listRecentGeneratedSongsForAdmin
 * returns, without having to page through every generation on the platform.
 */
export async function getGeneratedSongOptionById(songGroupId: string): Promise<GeneratedSongOption | null> {
  const trimmed = songGroupId.trim();
  if (!trimmed) return null;
  const rows = await getServiceDb()
    .select({
      id: musicGenerationJobs.id,
      userId: musicGenerationJobs.userId,
      songGroupId: musicGenerationJobs.songGroupId,
      title: musicGenerationJobs.title,
      style: musicGenerationJobs.style,
      plays: musicGenerationJobs.plays,
    })
    .from(musicGenerationJobs)
    .where(and(eq(musicGenerationJobs.songGroupId, trimmed), eq(musicGenerationJobs.status, "completed")))
    .orderBy(desc(musicGenerationJobs.createdAt))
    .limit(1);
  return rows[0] ? toGeneratedSongOption(rows[0]) : null;
}
