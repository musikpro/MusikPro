import "server-only";

import { asc, desc, eq, inArray, isNotNull, and } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { discoverHiddenSongs, discoverSettings, musicGenerationJobs } from "@/db/schema";
import { extractGenreLabel } from "@/lib/ai/songs";
import { stripVersionSuffix } from "@/lib/ai/song-title";
import {
  DISCOVER_MAX_ITEMS_MAX,
  DISCOVER_MAX_ITEMS_MIN,
  DISCOVER_SORT_OPTIONS,
  type DiscoverSettingsValue,
  type DiscoverSong,
} from "./types";

export const DEFAULT_DISCOVER_SETTINGS: DiscoverSettingsValue = { enabled: true, sortBy: "recent", maxItems: 60 };

/** How many recent completed generations are scanned before grouping versions into songs. */
const DISCOVER_SCAN_LIMIT = 800;

export async function getDiscoverSettings(): Promise<DiscoverSettingsValue> {
  try {
    const [row] = await getServiceDb().select().from(discoverSettings).where(eq(discoverSettings.id, "global")).limit(1);
    if (!row) return DEFAULT_DISCOVER_SETTINGS;
    return {
      enabled: row.enabled,
      sortBy: (DISCOVER_SORT_OPTIONS as readonly string[]).includes(row.sortBy) ? (row.sortBy as DiscoverSettingsValue["sortBy"]) : "recent",
      maxItems: Math.min(DISCOVER_MAX_ITEMS_MAX, Math.max(DISCOVER_MAX_ITEMS_MIN, row.maxItems)),
    };
  } catch {
    return DEFAULT_DISCOVER_SETTINGS;
  }
}

type DiscoverRow = {
  songGroupId: string;
  userId: string | null;
  title: string | null;
  style: string | null;
  plays: number;
  coverUrl: string | null;
  audioUrl: string | null;
  versionLabel: string | null;
  createdAt: Date;
};

/** Every completed generation (both versions of a song), newest first — the raw material of the library. */
async function listCompletedSongRows(): Promise<DiscoverRow[]> {
  const rows = await getServiceDb()
    .select({
      songGroupId: musicGenerationJobs.songGroupId,
      userId: musicGenerationJobs.userId,
      title: musicGenerationJobs.title,
      style: musicGenerationJobs.style,
      plays: musicGenerationJobs.plays,
      coverUrl: musicGenerationJobs.coverUrl,
      audioUrl: musicGenerationJobs.audioUrl,
      versionLabel: musicGenerationJobs.versionLabel,
      createdAt: musicGenerationJobs.createdAt,
    })
    .from(musicGenerationJobs)
    .where(
      and(
        eq(musicGenerationJobs.status, "completed"),
        isNotNull(musicGenerationJobs.songGroupId),
        isNotNull(musicGenerationJobs.audioUrl),
      ),
    )
    .orderBy(desc(musicGenerationJobs.createdAt))
    .limit(DISCOVER_SCAN_LIMIT);
  return rows.filter((row): row is DiscoverRow => Boolean(row.songGroupId));
}

function groupIntoSongs(rows: DiscoverRow[], viewerUserId: string | null): DiscoverSong[] {
  const groups = new Map<string, DiscoverRow[]>();
  for (const row of rows) groups.set(row.songGroupId, [...(groups.get(row.songGroupId) ?? []), row]);
  return Array.from(groups.values()).map((versions) => {
    // The first version stands in for the song, exactly like "Mes chansons".
    const first = versions.slice().sort((a, b) => (a.versionLabel || "").localeCompare(b.versionLabel || ""))[0];
    return {
      songGroupId: first.songGroupId,
      title: stripVersionSuffix(first.title || "") || "Chanson MusikPro",
      style: extractGenreLabel(first.style),
      plays: versions.reduce((sum, version) => sum + version.plays, 0),
      coverUrl: first.coverUrl,
      audioUrl: first.audioUrl as string,
      mine: Boolean(viewerUserId) && first.userId === viewerUserId,
    };
  });
}

async function hiddenGroupIds(): Promise<Set<string>> {
  const rows = await getServiceDb().select({ id: discoverHiddenSongs.songGroupId }).from(discoverHiddenSongs);
  return new Set(rows.map((row) => row.id));
}

/**
 * The client "Découvrir" page: every completed song, automatically, minus the ones removed by their
 * owner or by the SaaS owner, ordered and capped by /admin/library's settings. Never throws — an
 * empty page is better than a crashed dashboard.
 */
export async function listDiscoverSongs(viewerUserId: string | null): Promise<DiscoverSong[]> {
  try {
    const settings = await getDiscoverSettings();
    if (!settings.enabled) return [];
    const [rows, hidden] = await Promise.all([listCompletedSongRows(), hiddenGroupIds()]);
    const songs = groupIntoSongs(rows, viewerUserId).filter((song) => !hidden.has(song.songGroupId));
    if (settings.sortBy === "popular") songs.sort((a, b) => b.plays - a.plays);
    return songs.slice(0, settings.maxItems);
  } catch {
    return [];
  }
}

export type AdminDiscoverSong = DiscoverSong & { hidden: boolean; hiddenBy: string | null };

/** Admin moderation list: the same songs, plus the ones currently hidden so they can be put back. */
export async function listDiscoverSongsForAdmin(limit = 100): Promise<AdminDiscoverSong[]> {
  const [rows, hiddenRows] = await Promise.all([
    listCompletedSongRows(),
    getServiceDb().select().from(discoverHiddenSongs).orderBy(asc(discoverHiddenSongs.createdAt)),
  ]);
  const hiddenBy = new Map(hiddenRows.map((row) => [row.songGroupId, row.hiddenBy]));
  return groupIntoSongs(rows, null)
    .slice(0, limit)
    .map((song) => ({ ...song, hidden: hiddenBy.has(song.songGroupId), hiddenBy: hiddenBy.get(song.songGroupId) ?? null }));
}

export async function hideDiscoverSong(songGroupId: string, hiddenBy: "owner" | "admin"): Promise<void> {
  await getServiceDb()
    .insert(discoverHiddenSongs)
    .values({ songGroupId, hiddenBy })
    // An admin removal always wins over an owner one; an owner removal never downgrades it.
    .onConflictDoUpdate({
      target: discoverHiddenSongs.songGroupId,
      set: { hiddenBy: hiddenBy === "admin" ? "admin" : discoverHiddenSongs.hiddenBy },
    });
}

/** Returns false when the song is hidden by an admin and the caller is not one. */
export async function restoreDiscoverSong(songGroupId: string, byAdmin: boolean): Promise<boolean> {
  const database = getServiceDb();
  const [row] = await database.select().from(discoverHiddenSongs).where(eq(discoverHiddenSongs.songGroupId, songGroupId)).limit(1);
  if (!row) return true;
  if (row.hiddenBy === "admin" && !byAdmin) return false;
  await database.delete(discoverHiddenSongs).where(inArray(discoverHiddenSongs.songGroupId, [songGroupId]));
  return true;
}
