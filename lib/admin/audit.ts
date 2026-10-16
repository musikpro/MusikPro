import "server-only";

import { and, desc, eq, gte, ilike, lt, or, sql, type SQL } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { auditLogs, user } from "@/db/schema";
import type { AuditFilters } from "@/lib/validation/audit-filters";
import { escapeLike } from "./generations";
import { clampPage, pageCount } from "./pagination";
import type { AuditPage, AuditRow } from "./audit-types";

export const AUDIT_PAGE_SIZE = 50;
/** Plafond de l'export CSV : les entrées les plus récentes d'abord. */
export const AUDIT_EXPORT_LIMIT = 10_000;

const DAY_MS = 24 * 60 * 60 * 1000;

function filterCondition(filters: AuditFilters): SQL | undefined {
  const conditions: SQL[] = [];
  if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters.actor) {
    const pattern = `%${escapeLike(filters.actor)}%`;
    const search = or(ilike(auditLogs.actorId, pattern), ilike(user.email, pattern), ilike(user.name, pattern));
    if (search) conditions.push(search);
  }
  // Dates en UTC ; la date de fin est inclusive (on borne au début du jour suivant).
  if (filters.from) conditions.push(gte(auditLogs.createdAt, new Date(`${filters.from}T00:00:00.000Z`)));
  if (filters.to)
    conditions.push(lt(auditLogs.createdAt, new Date(new Date(`${filters.to}T00:00:00.000Z`).getTime() + DAY_MS)));
  return conditions.length ? and(...conditions) : undefined;
}

const columns = {
  id: auditLogs.id,
  createdAt: auditLogs.createdAt,
  actorId: auditLogs.actorId,
  actorName: user.name,
  actorEmail: user.email,
  action: auditLogs.action,
  targetType: auditLogs.targetType,
  targetId: auditLogs.targetId,
  ip: auditLogs.ip,
  metadata: auditLogs.metadata,
};

type RawRow = {
  id: string;
  createdAt: Date;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  metadata: unknown;
};

function toRow(row: RawRow): AuditRow {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

/** Une page du journal, la plus récente d'abord, avec le total pour la pagination. */
export async function listAuditPage(filters: AuditFilters, pageSize = AUDIT_PAGE_SIZE): Promise<AuditPage> {
  const database = getServiceDb();
  const where = filterCondition(filters);

  const [{ total }] = await database
    .select({ total: sql<number>`count(*)::int` })
    .from(auditLogs)
    .leftJoin(user, eq(user.id, auditLogs.actorId))
    .where(where);

  const page = clampPage(filters.page, total, pageSize);
  const rows = await database
    .select(columns)
    .from(auditLogs)
    .leftJoin(user, eq(user.id, auditLogs.actorId))
    .where(where)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows: rows.map(toRow), total, page, pageSize, pageCount: pageCount(total, pageSize) };
}

/** Les entrées à exporter (mêmes filtres que la page), plafonnées à AUDIT_EXPORT_LIMIT. */
export async function listAuditForExport(filters: AuditFilters): Promise<AuditRow[]> {
  const rows = await getServiceDb()
    .select(columns)
    .from(auditLogs)
    .leftJoin(user, eq(user.id, auditLogs.actorId))
    .where(filterCondition(filters))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(AUDIT_EXPORT_LIMIT);
  return rows.map(toRow);
}

/** Actions déjà journalisées, pour le menu déroulant du filtre. */
export async function listAuditActions(): Promise<string[]> {
  const rows = await getServiceDb()
    .selectDistinct({ action: auditLogs.action })
    .from(auditLogs)
    .orderBy(auditLogs.action)
    .limit(500);
  return rows.map((row) => row.action);
}
