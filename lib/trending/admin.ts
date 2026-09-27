import "server-only";

import { desc, eq } from "drizzle-orm";
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

/** Every publicly published song, platform-wide — feeds the manual picker and the auto ranking. */
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
