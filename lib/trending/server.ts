import "server-only";

import { and, desc, eq, gt } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs, songPublications } from "@/db/schema";
import { getTrendingSettings } from "./settings";
import { TRENDING_POOL_SIZE } from "./types";

export type TrendingSong = {
  slug: string;
  title: string;
  plays: number;
};

function shuffle<T>(items: T[]): T[] {
  const shuffled = items.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function autoPool(limit: number): Promise<TrendingSong[]> {
  const database = getServiceDb();
  const rows = await database
    .select({ slug: songPublications.slug, title: musicGenerationJobs.title, plays: musicGenerationJobs.plays })
    .from(songPublications)
    .innerJoin(musicGenerationJobs, eq(musicGenerationJobs.id, songPublications.jobId))
    .where(and(eq(musicGenerationJobs.status, "completed"), gt(musicGenerationJobs.plays, 0)))
    .orderBy(desc(musicGenerationJobs.plays))
    .limit(limit);
  return rows.map((row) => ({ slug: row.slug, title: row.title || "Chanson MusikPro", plays: row.plays }));
}

async function manualPool(songGroupIds: string[]): Promise<TrendingSong[]> {
  if (songGroupIds.length === 0) return [];
  const database = getServiceDb();
  const rows = await database
    .select({
      songGroupId: songPublications.songGroupId,
      slug: songPublications.slug,
      title: musicGenerationJobs.title,
      plays: musicGenerationJobs.plays,
    })
    .from(songPublications)
    .innerJoin(musicGenerationJobs, eq(musicGenerationJobs.id, songPublications.jobId))
    .where(eq(musicGenerationJobs.status, "completed"));
  const bySongGroupId = new Map(rows.map((row) => [row.songGroupId, row]));
  return songGroupIds
    .map((id) => bySongGroupId.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => ({ slug: row.slug, title: row.title || "Chanson MusikPro", plays: row.plays }));
}

/**
 * Songs shown in the "Tendances" widget of the client dashboard (see
 * components/banani/UserDashboardDesktop.tsx and UserDashboardMobile.tsx, which render every card
 * with the MusikPro logo as its cover — see /admin/trending). Mode, count and randomize are set
 * from the admin panel:
 * - automatic: pool is publicly published songs ranked by play count (top `count`, or top
 *   TRENDING_POOL_SIZE when randomize is on);
 * - manual: pool is the admin's ordered picks (up to TRENDING_POOL_SIZE);
 * - randomize on: `count` songs are drawn at random from the pool on every render, so different
 *   visits can show a different subset instead of always the same ones.
 */
export async function getTrendingSongs(): Promise<TrendingSong[]> {
  try {
    const settings = await getTrendingSettings();
    const pool =
      settings.mode === "manual"
        ? await manualPool(settings.manualSelection)
        : await autoPool(settings.randomize ? TRENDING_POOL_SIZE : settings.count);
    const ordered = settings.randomize ? shuffle(pool) : pool;
    return ordered.slice(0, settings.count);
  } catch {
    return [];
  }
}
