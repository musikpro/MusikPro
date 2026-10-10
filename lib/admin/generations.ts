import "server-only";

import { and, desc, eq, ilike, notInArray, or, sql, type SQL } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs, user } from "@/db/schema";
import { extractGenreLabel } from "@/lib/ai/songs";
import { clampPage, pageCount } from "./pagination";
import type { AdminGenerationRow, GenerationsPage, GenerationStatusFilter } from "./generations-types";

const TERMINAL_STATUSES = ["completed", "failed", "cancelled"] as const;

/** Time from creation to the final state, or to now while the job is still pending (never negative). */
function elapsedSeconds(row: { status: string; createdAt: Date; completedAt: Date | null; failedAt: Date | null }) {
  const isTerminal = (TERMINAL_STATUSES as readonly string[]).includes(row.status);
  const end = isTerminal ? (row.completedAt ?? row.failedAt) : new Date();
  return end ? Math.max(0, Math.round((end.getTime() - row.createdAt.getTime()) / 1000)) : null;
}

/** Échappe %, _ et \ pour une recherche « contient » littérale avec ILIKE. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function filterCondition(status: GenerationStatusFilter, query: string): SQL | undefined {
  const conditions: SQL[] = [];
  if (status === "completed") conditions.push(eq(musicGenerationJobs.status, "completed"));
  else if (status === "failed") conditions.push(eq(musicGenerationJobs.status, "failed"));
  else if (status === "processing") conditions.push(notInArray(musicGenerationJobs.status, [...TERMINAL_STATUSES]));
  const needle = query.trim();
  if (needle) {
    const pattern = `%${escapeLike(needle)}%`;
    const search = or(
      ilike(user.email, pattern),
      ilike(musicGenerationJobs.title, pattern),
      ilike(musicGenerationJobs.occasion, pattern),
      ilike(musicGenerationJobs.style, pattern),
    );
    if (search) conditions.push(search);
  }
  return conditions.length ? and(...conditions) : undefined;
}

/** Une page de versions générées, la plus récente d'abord, avec le total pour la pagination. */
export async function listGenerationsPage(input: {
  page: number;
  pageSize: number;
  status: GenerationStatusFilter;
  query: string;
}): Promise<GenerationsPage> {
  const database = getServiceDb();
  const where = filterCondition(input.status, input.query);

  const [{ total }] = await database
    .select({ total: sql<number>`count(*)::int` })
    .from(musicGenerationJobs)
    .leftJoin(user, eq(musicGenerationJobs.userId, user.id))
    .where(where);

  const page = clampPage(input.page, total, input.pageSize);
  const rows = await database
    .select({
      id: musicGenerationJobs.id,
      songGroupId: musicGenerationJobs.songGroupId,
      userEmail: user.email,
      title: musicGenerationJobs.title,
      occasion: musicGenerationJobs.occasion,
      style: musicGenerationJobs.style,
      versionLabel: musicGenerationJobs.versionLabel,
      status: musicGenerationJobs.status,
      provider: musicGenerationJobs.provider,
      model: musicGenerationJobs.model,
      durationSeconds: musicGenerationJobs.durationSeconds,
      audioUrl: musicGenerationJobs.audioUrl,
      failureReason: musicGenerationJobs.failureReason,
      providerStatus: musicGenerationJobs.providerStatus,
      createdAt: musicGenerationJobs.createdAt,
      completedAt: musicGenerationJobs.completedAt,
      failedAt: musicGenerationJobs.failedAt,
    })
    .from(musicGenerationJobs)
    .leftJoin(user, eq(musicGenerationJobs.userId, user.id))
    .where(where)
    .orderBy(desc(musicGenerationJobs.createdAt), desc(musicGenerationJobs.id))
    .limit(input.pageSize)
    .offset((page - 1) * input.pageSize);

  const mapped: AdminGenerationRow[] = rows.map((row) => ({
    id: row.id,
    songGroupId: row.songGroupId,
    userEmail: row.userEmail,
    title: row.title,
    occasion: row.occasion,
    style: row.style,
    styleLabel: extractGenreLabel(row.style),
    versionLabel: row.versionLabel,
    status: row.status,
    provider: row.provider,
    model: row.model,
    durationSeconds: row.durationSeconds,
    audioUrl: row.audioUrl,
    failureReason: row.failureReason,
    providerStatus: row.providerStatus,
    elapsedSeconds: elapsedSeconds(row),
    createdAt: row.createdAt.toISOString(),
  }));
  return { rows: mapped, total, page, pageSize: input.pageSize, pageCount: pageCount(total, input.pageSize) };
}

export type GenerationsStats = {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  avgDurationSeconds: number;
};

/** Compteurs du haut de page, calculés sur toutes les versions (et non sur la seule page affichée). */
export async function getGenerationsStats(): Promise<GenerationsStats> {
  const [row] = await getServiceDb()
    .select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`(count(*) filter (where ${musicGenerationJobs.status} = 'completed'))::int`,
      failed: sql<number>`(count(*) filter (where ${musicGenerationJobs.status} = 'failed'))::int`,
      processing: sql<number>`(count(*) filter (where ${musicGenerationJobs.status} not in ('completed', 'failed', 'cancelled')))::int`,
      avgDurationSeconds: sql<number>`coalesce(round(avg(coalesce(${musicGenerationJobs.durationSeconds}, 0)) filter (where ${musicGenerationJobs.status} = 'completed')), 0)::int`,
    })
    .from(musicGenerationJobs);
  return row ?? { total: 0, completed: 0, failed: 0, processing: 0, avgDurationSeconds: 0 };
}
