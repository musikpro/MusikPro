import "server-only";
import { stripVersionSuffix, withVersionSuffix } from "@/lib/ai/song-title";
import { randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs, songPublications } from "@/db/schema";
import { createMusicJob, MusicJobOwnershipError } from "./music-jobs";
import { pollJobForProvider, submitSongGroupJobsForProvider } from "./audio-providers/dispatch";
import { findSongGroupUsages } from "./song-usage";

type JobRow = typeof musicGenerationJobs.$inferSelect;

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

export type SongVersionView = {
  jobId: string;
  label: string;
  status: string;
  durationSeconds: number | null;
  duration: string;
  audioUrl: string | null;
  coverUrl: string | null;
  plays: number;
  liked: boolean;
  failureReason: string | null;
};

export type SongGroupView = {
  songGroupId: string;
  title: string;
  occasion: string | null;
  style: string | null;
  lyrics: string | null;
  coverUrl: string | null;
  status: "processing" | "completed" | "failed";
  createdAt: Date;
  versions: SongVersionView[];
};

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}m ${String(remaining).padStart(2, "0")}s`;
}

function toVersionView(job: JobRow): SongVersionView {
  return {
    jobId: job.id,
    label: job.versionLabel || "Version",
    status: job.status,
    durationSeconds: job.durationSeconds,
    duration: formatDuration(job.durationSeconds),
    audioUrl: job.audioUrl,
    coverUrl: job.coverUrl,
    plays: job.plays,
    liked: job.liked,
    failureReason: job.status === "failed" ? job.failureReason || "La génération a échoué." : null,
  };
}

/**
 * `job.style` stores the full AI-directive prompt sent to Musicful (see
 * lib/ai/style-prompt.ts — genre name + curated instrumentation/rhythm guidance + optional
 * mood), not a short genre label. That's correct for what Musicful needs, but showing the
 * whole paragraph to the user in a "style" badge was never intended. Every shape
 * resolveStylePrompt can produce starts with the bare genre name followed by " (" or " — ", so
 * splitting on the first occurrence of either recovers just the genre for display — including
 * for songs generated before this fix, since it reads from the already-stored value.
 */
export function extractGenreLabel(style: string | null): string | null {
  if (!style) return style;
  const match = style.match(/^(.*?)(?: \(| — )/);
  return (match ? match[1] : style).trim();
}

function toGroupView(jobs: JobRow[]): SongGroupView {
  const [first] = jobs;
  const hasCompleted = jobs.some((job) => job.status === "completed");
  const hasPending = jobs.some((job) => !TERMINAL_STATUSES.has(job.status));
  const status: SongGroupView["status"] = hasCompleted ? "completed" : hasPending ? "processing" : "failed";
  return {
    songGroupId: first.songGroupId!,
    title: stripVersionSuffix(first.title || "") || "Chanson MusikPro",
    occasion: first.occasion,
    style: extractGenreLabel(first.style),
    lyrics: first.lyrics,
    coverUrl: first.coverUrl,
    status,
    createdAt: jobs.reduce((min, job) => (job.createdAt < min ? job.createdAt : min), first.createdAt),
    versions: jobs
      .slice()
      .sort((a, b) => (a.versionLabel || "").localeCompare(b.versionLabel || ""))
      .map(toVersionView),
  };
}

export async function submitSongGeneration(
  userId: string,
  input: {
    title: string;
    occasion: string;
    style: string;
    lyrics: string;
    gender: "male" | "female" | "";
    instrumental?: 0 | 1;
  },
  model: string,
  versionsPerGeneration: number,
  providerId = "musicful",
) {
  const songGroupId = randomUUID();
  const jobs = await Promise.all(
    Array.from({ length: versionsPerGeneration }, (_, index) =>
      createMusicJob(
        userId,
        {
          title: withVersionSuffix(input.title, index + 1),
          style: input.style,
          lyrics: input.lyrics,
          gender: input.gender,
          instrumental: input.instrumental ?? 0,
        },
        model,
        { songGroupId, versionLabel: `Version ${index + 1}`, occasion: input.occasion, provider: providerId },
      ),
    ),
  );
  const { succeeded, failed } = await submitSongGroupJobsForProvider(jobs.map((job) => job.id));
  return { songGroupId, succeeded, failed };
}

/**
 * Polls Musicful for every non-terminal job among the given rows. Callers that show live
 * status (the songs list AND the detail/poll endpoint) must both go through this — a
 * "processing" job never advances on its own, so any read path that skips this stays
 * stuck forever even though the underlying Musicful task may already be done.
 */
/** Max time the library listing waits for pending provider polls before answering with what the database holds. */
const LIST_POLL_BUDGET_MS = 4_000;

async function refreshPendingRows(rows: JobRow[], userId: string): Promise<JobRow[]> {
  const pending = rows.filter((row) => !TERMINAL_STATUSES.has(row.status));
  if (!pending.length) return rows;
  // Bounded wait: a slow audio provider must never make the whole library request hang past the browser's
  // timeout (the page would then not even learn that a song is generating). Whatever is not finished within
  // the budget keeps being polled per song by the client (/api/songs/[groupId]).
  const polls = Promise.all(
    pending.map((row) =>
      pollJobForProvider(row.id, userId).catch((error) => {
        if (error instanceof MusicJobOwnershipError) return null;
        return null;
      }),
    ),
  );
  await Promise.race([polls, new Promise<void>((resolve) => setTimeout(resolve, LIST_POLL_BUDGET_MS))]);
  const database = getServiceDb();
  return database
    .select()
    .from(musicGenerationJobs)
    .where(and(eq(musicGenerationJobs.userId, userId), isNotNull(musicGenerationJobs.songGroupId)))
    .orderBy(desc(musicGenerationJobs.createdAt));
}

export async function listSongGroupsForUser(userId: string): Promise<SongGroupView[]> {
  const database = getServiceDb();
  const rows = await database
    .select()
    .from(musicGenerationJobs)
    .where(and(eq(musicGenerationJobs.userId, userId), isNotNull(musicGenerationJobs.songGroupId)))
    .orderBy(desc(musicGenerationJobs.createdAt));
  const refreshed = await refreshPendingRows(rows, userId);
  const groups = new Map<string, JobRow[]>();
  for (const row of refreshed) {
    const key = row.songGroupId!;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  return Array.from(groups.values())
    .map(toGroupView)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getSongGroupForUser(userId: string, songGroupId: string): Promise<SongGroupView | null> {
  const database = getServiceDb();
  const rows = await database
    .select()
    .from(musicGenerationJobs)
    .where(and(eq(musicGenerationJobs.userId, userId), eq(musicGenerationJobs.songGroupId, songGroupId)));
  if (!rows.length) return null;
  const pending = rows.filter((row) => !TERMINAL_STATUSES.has(row.status));
  if (pending.length) {
    await Promise.all(
      pending.map((row) =>
        pollJobForProvider(row.id, userId).catch((error) => {
          if (error instanceof MusicJobOwnershipError) return null;
          return null;
        }),
      ),
    );
    const refreshed = await database
      .select()
      .from(musicGenerationJobs)
      .where(and(eq(musicGenerationJobs.userId, userId), eq(musicGenerationJobs.songGroupId, songGroupId)));
    return toGroupView(refreshed);
  }
  return toGroupView(rows);
}

/** Thrown when a song can't be deleted because the platform currently displays it somewhere. */
export class SongInUseError extends Error {
  constructor(public usages: string[]) {
    super("SONG_IN_USE");
  }
}

export async function removeSongGroupForUser(userId: string, songGroupId: string) {
  const usages = await findSongGroupUsages(songGroupId);
  if (usages.length) throw new SongInUseError(usages);
  const database = getServiceDb();
  await database
    .delete(musicGenerationJobs)
    .where(and(eq(musicGenerationJobs.userId, userId), eq(musicGenerationJobs.songGroupId, songGroupId)));
}

export async function setSongVersionLiked(userId: string, jobId: string, liked: boolean): Promise<SongVersionView> {
  const database = getServiceDb();
  const [job] = await database
    .update(musicGenerationJobs)
    .set({ liked, updatedAt: new Date() })
    .where(and(eq(musicGenerationJobs.id, jobId), eq(musicGenerationJobs.userId, userId)))
    .returning();
  if (!job) throw new MusicJobOwnershipError();
  return toVersionView(job);
}

export async function incrementSongVersionPlays(userId: string, jobId: string): Promise<SongVersionView> {
  const database = getServiceDb();
  const [job] = await database
    .update(musicGenerationJobs)
    .set({ plays: sql`${musicGenerationJobs.plays} + 1`, updatedAt: new Date() })
    .where(and(eq(musicGenerationJobs.id, jobId), eq(musicGenerationJobs.userId, userId)))
    .returning();
  if (!job) throw new MusicJobOwnershipError();
  return toVersionView(job);
}

export async function setSongGroupCover(userId: string, songGroupId: string, coverUrl: string): Promise<void> {
  const database = getServiceDb();
  const result = await database
    .update(musicGenerationJobs)
    .set({ coverUrl, updatedAt: new Date() })
    .where(and(eq(musicGenerationJobs.userId, userId), eq(musicGenerationJobs.songGroupId, songGroupId)))
    .returning({ id: musicGenerationJobs.id });
  if (!result.length) throw new MusicJobOwnershipError();
}

export class SongNotReadyError extends Error {}

/**
 * `jobId` lets the caller pick which version (when a song has more than one) becomes the one
 * served at the public link. Omitting it keeps the original behavior (first version, and a
 * pure idempotent no-op if already published). Passing it on a song that's already published
 * updates which version that SAME slug serves, rather than minting a second link — a link once
 * shared stays valid, it just starts playing the newly chosen take.
 */
export async function publishSongGroup(userId: string, songGroupId: string, jobId?: string): Promise<{ slug: string }> {
  const database = getServiceDb();
  const [existing] = await database
    .select({ slug: songPublications.slug })
    .from(songPublications)
    .where(and(eq(songPublications.songGroupId, songGroupId), eq(songPublications.userId, userId)));
  if (existing && !jobId) return { slug: existing.slug };

  const group = await getSongGroupForUser(userId, songGroupId);
  if (!group) throw new MusicJobOwnershipError();
  const chosen = jobId ? group.versions.find((version) => version.jobId === jobId) : group.versions[0];
  if (!chosen?.audioUrl || chosen.status !== "completed") throw new SongNotReadyError();

  if (existing) {
    await database.update(songPublications).set({ jobId: chosen.jobId }).where(eq(songPublications.songGroupId, songGroupId));
    return { slug: existing.slug };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = randomBytes(6).toString("base64url");
    try {
      await database.insert(songPublications).values({ songGroupId, userId, slug, jobId: chosen.jobId });
      return { slug };
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  throw new Error("unreachable");
}

export type PublicSongView = {
  title: string;
  style: string | null;
  occasion: string | null;
  coverUrl: string | null;
  audioUrl: string;
};

export async function getPublicSongBySlug(slug: string): Promise<PublicSongView | null> {
  const database = getServiceDb();
  const [row] = await database
    .select({ job: musicGenerationJobs })
    .from(songPublications)
    .innerJoin(
      musicGenerationJobs,
      and(eq(musicGenerationJobs.id, songPublications.jobId), eq(musicGenerationJobs.userId, songPublications.userId)),
    )
    .where(eq(songPublications.slug, slug));
  if (!row || row.job.status !== "completed" || !row.job.audioUrl) return null;
  return {
    title: row.job.title || "Chanson MusikPro",
    style: extractGenreLabel(row.job.style),
    occasion: row.job.occasion,
    coverUrl: row.job.coverUrl,
    audioUrl: row.job.audioUrl,
  };
}
