import "server-only";

import { eq, inArray, lt } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getServiceDb } from "@/db";
import {
  discoverHiddenSongs,
  discoverSharedSongs,
  landingSongFeatures,
  musicGenerationJobs,
  songPublications,
  trashedSongs,
  trendingSettings,
  user,
} from "@/db/schema";
import { expiryCutoff } from "./retention";

type Row = Record<string, unknown>;

type SongSnapshot = {
  jobs: Row[];
  shared: Row[];
  hidden: Row[];
  publications: Row[];
  landing: Row[];
  trending: { inManual: boolean; cover: string | null };
};

export type TrashedSong = {
  songKey: string;
  title: string | null;
  ownerEmail: string | null;
  versions: number;
  deletedAt: Date;
  deletedBy: string | null;
};

/** Les dates passent en texte ISO dans l'instantané JSON : on les remet en `Date` avant de réinsérer (colonnes `…At`). */
function reviveDates<T extends Row>(row: T): T {
  const revived: Row = { ...row };
  for (const [key, value] of Object.entries(revived)) {
    if (key.endsWith("At") && typeof value === "string") revived[key] = new Date(value);
  }
  return revived as T;
}

/**
 * Met une chanson à la corbeille : toutes ses versions (le groupe) et ce qui la référence — partage et retrait
 * Découvrir, lien public, emplacements « mis en avant » de l'accueil, vivier manuel de « Tendances » — sont copiés
 * dans un instantané puis retirés des tables actives, dans une seule transaction. Aucune lecture existante ne change.
 * Une génération ancienne sans groupe ne met que sa propre ligne. Renvoie null quand la chanson n'existe plus.
 */
export async function trashSongByJobId(
  jobId: string,
  deletedBy: string,
): Promise<{ songKey: string; title: string | null; versions: number } | null> {
  const database = getServiceDb();
  const [job] = await database.select().from(musicGenerationJobs).where(eq(musicGenerationJobs.id, jobId)).limit(1);
  if (!job) return null;

  const groupId = job.songGroupId;
  const jobs = groupId
    ? await database.select().from(musicGenerationJobs).where(eq(musicGenerationJobs.songGroupId, groupId))
    : [job];
  const songKey = groupId ?? `job:${job.id}`;
  const [owner] = job.userId
    ? await database.select({ email: user.email }).from(user).where(eq(user.id, job.userId)).limit(1)
    : [];

  const snapshot: SongSnapshot = {
    jobs,
    shared: [],
    hidden: [],
    publications: [],
    landing: [],
    trending: { inManual: false, cover: null },
  };
  const cleanup: BatchItem<"pg">[] = [];
  const trendingUpdate: BatchItem<"pg">[] = [];

  if (groupId) {
    const [shared, hidden, publications, landing, trendingRows] = await Promise.all([
      database.select().from(discoverSharedSongs).where(eq(discoverSharedSongs.songGroupId, groupId)),
      database.select().from(discoverHiddenSongs).where(eq(discoverHiddenSongs.songGroupId, groupId)),
      database.select().from(songPublications).where(eq(songPublications.songGroupId, groupId)),
      database.select().from(landingSongFeatures).where(eq(landingSongFeatures.songGroupId, groupId)),
      database.select().from(trendingSettings).where(eq(trendingSettings.id, "global")).limit(1),
    ]);
    snapshot.shared = shared;
    snapshot.hidden = hidden;
    snapshot.publications = publications;
    snapshot.landing = landing;
    cleanup.push(
      database.delete(landingSongFeatures).where(eq(landingSongFeatures.songGroupId, groupId)),
      database.delete(discoverSharedSongs).where(eq(discoverSharedSongs.songGroupId, groupId)),
      database.delete(discoverHiddenSongs).where(eq(discoverHiddenSongs.songGroupId, groupId)),
      database.delete(songPublications).where(eq(songPublications.songGroupId, groupId)),
    );
    const trending = trendingRows[0];
    if (trending) {
      const manual = Array.isArray(trending.manualSelection) ? (trending.manualSelection as string[]) : [];
      const covers = (trending.coverOverrides ?? {}) as Record<string, string>;
      snapshot.trending = { inManual: manual.includes(groupId), cover: covers[groupId] ?? null };
      if (snapshot.trending.inManual || snapshot.trending.cover) {
        trendingUpdate.push(
          database
            .update(trendingSettings)
            .set({
              manualSelection: manual.filter((id) => id !== groupId),
              coverOverrides: Object.fromEntries(Object.entries(covers).filter(([id]) => id !== groupId)),
              updatedAt: new Date(),
            })
            .where(eq(trendingSettings.id, "global")),
        );
      }
    }
  }

  const title = job.title;
  const statements: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    database
      .insert(trashedSongs)
      .values({
        songKey,
        title,
        ownerId: job.userId,
        ownerEmail: owner?.email ?? null,
        versions: jobs.length,
        snapshot,
        deletedBy,
      })
      // Une chanson déjà en corbeille (cas rare) garde son instantané d'origine.
      .onConflictDoNothing(),
    ...cleanup,
    ...trendingUpdate,
    database.delete(musicGenerationJobs).where(
      inArray(
        musicGenerationJobs.id,
        jobs.map((entry) => entry.id),
      ),
    ),
  ];
  await database.batch(statements);
  return { songKey, title, versions: jobs.length };
}

export async function listTrashedSongs(): Promise<TrashedSong[]> {
  const rows = await getServiceDb()
    .select({
      songKey: trashedSongs.songKey,
      title: trashedSongs.title,
      ownerEmail: trashedSongs.ownerEmail,
      versions: trashedSongs.versions,
      deletedAt: trashedSongs.deletedAt,
      deletedBy: trashedSongs.deletedBy,
    })
    .from(trashedSongs)
    .orderBy(trashedSongs.deletedAt);
  return rows.reverse();
}

/** Remet la chanson et ses références en place. Renvoie false quand elle n'est plus en corbeille. */
export async function restoreTrashedSong(songKey: string): Promise<{ title: string | null } | null> {
  const database = getServiceDb();
  const [entry] = await database.select().from(trashedSongs).where(eq(trashedSongs.songKey, songKey)).limit(1);
  if (!entry) return null;
  const snapshot = entry.snapshot as SongSnapshot;

  // Le propriétaire a pu être supprimé entre-temps : on rattache alors la chanson à personne (user_id nul), comme le fait la base.
  const ownerIds = Array.from(
    new Set(
      [...snapshot.jobs, ...snapshot.shared]
        .map((row) => row.userId)
        .filter((id): id is string => typeof id === "string"),
    ),
  );
  const existing = ownerIds.length
    ? new Set(
        (await database.select({ id: user.id }).from(user).where(inArray(user.id, ownerIds))).map((row) => row.id),
      )
    : new Set<string>();
  const knownOwner = (id: unknown) => typeof id === "string" && existing.has(id);

  const jobs = snapshot.jobs.map((row) => {
    const revived = reviveDates(row);
    return {
      ...revived,
      userId: knownOwner(revived.userId) ? revived.userId : null,
    } as typeof musicGenerationJobs.$inferInsert;
  });
  const shared = snapshot.shared
    .map(reviveDates)
    .filter((row) => knownOwner(row.userId)) as (typeof discoverSharedSongs.$inferInsert)[];
  const hidden = snapshot.hidden.map(reviveDates) as (typeof discoverHiddenSongs.$inferInsert)[];
  const publications = snapshot.publications.map(reviveDates) as (typeof songPublications.$inferInsert)[];
  const landing = snapshot.landing.map((row) => {
    const revived = reviveDates(row);
    return {
      ...revived,
      updatedBy: knownOwner(revived.updatedBy) ? revived.updatedBy : null,
    } as typeof landingSongFeatures.$inferInsert;
  });

  const groupId = entry.songKey.startsWith("job:") ? null : entry.songKey;
  const [trending] = groupId
    ? await database.select().from(trendingSettings).where(eq(trendingSettings.id, "global")).limit(1)
    : [];
  const manual = Array.isArray(trending?.manualSelection) ? (trending.manualSelection as string[]) : [];
  const covers = (trending?.coverOverrides ?? {}) as Record<string, string>;
  const restoreTrending: BatchItem<"pg">[] =
    groupId && trending && (snapshot.trending.inManual || snapshot.trending.cover)
      ? [
          database
            .update(trendingSettings)
            .set({
              manualSelection: snapshot.trending.inManual && !manual.includes(groupId) ? [...manual, groupId] : manual,
              coverOverrides: snapshot.trending.cover ? { ...covers, [groupId]: snapshot.trending.cover } : covers,
              updatedAt: new Date(),
            })
            .where(eq(trendingSettings.id, "global")),
        ]
      : [];

  const restore: BatchItem<"pg">[] = [
    ...(jobs.length ? [database.insert(musicGenerationJobs).values(jobs).onConflictDoNothing()] : []),
    ...(shared.length ? [database.insert(discoverSharedSongs).values(shared).onConflictDoNothing()] : []),
    ...(hidden.length ? [database.insert(discoverHiddenSongs).values(hidden).onConflictDoNothing()] : []),
    ...(publications.length ? [database.insert(songPublications).values(publications).onConflictDoNothing()] : []),
    ...(landing.length ? [database.insert(landingSongFeatures).values(landing).onConflictDoNothing()] : []),
    ...restoreTrending,
    database.delete(trashedSongs).where(eq(trashedSongs.songKey, songKey)),
  ];
  await database.batch(restore as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
  return { title: entry.title };
}

/** Supprime définitivement une chanson de la corbeille (irréversible). */
export async function purgeTrashedSong(songKey: string): Promise<boolean> {
  const deleted = await getServiceDb()
    .delete(trashedSongs)
    .where(eq(trashedSongs.songKey, songKey))
    .returning({ key: trashedSongs.songKey });
  return deleted.length > 0;
}

/** Purge automatique : supprime les chansons en corbeille depuis plus longtemps que le délai. Renvoie leur nombre. */
export async function purgeExpiredTrashedSongs(retentionDays: number, now: Date = new Date()): Promise<number> {
  const deleted = await getServiceDb()
    .delete(trashedSongs)
    .where(lt(trashedSongs.deletedAt, expiryCutoff(retentionDays, now)))
    .returning({ key: trashedSongs.songKey });
  return deleted.length;
}
