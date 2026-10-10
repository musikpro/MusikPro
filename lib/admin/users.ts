import "server-only";

import { and, desc, ilike, or, sql, type SQL } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { user } from "@/db/schema";
import { ADMIN_ROLES } from "@/lib/auth/permissions";
import { escapeLike } from "./generations";
import { clampPage, pageCount } from "./pagination";
import type { UserStateFilter, UsersPage } from "./users-types";

function filterCondition(state: UserStateFilter, query: string): SQL | undefined {
  const conditions: SQL[] = [];
  if (state === "active") conditions.push(sql`coalesce(${user.banned}, false) = false`);
  else if (state === "inactive") conditions.push(sql`coalesce(${user.banned}, false) = true`);
  const needle = query.trim();
  if (needle) {
    const pattern = `%${escapeLike(needle)}%`;
    const search = or(ilike(user.name, pattern), ilike(user.email, pattern), ilike(user.role, pattern));
    if (search) conditions.push(search);
  }
  return conditions.length ? and(...conditions) : undefined;
}

/** Une page de comptes, le plus récent d'abord, avec le total pour la pagination. */
export async function listUsersPage(input: {
  page: number;
  pageSize: number;
  state: UserStateFilter;
  query: string;
}): Promise<UsersPage> {
  const database = getServiceDb();
  const where = filterCondition(input.state, input.query);

  const [{ total }] = await database
    .select({ total: sql<number>`count(*)::int` })
    .from(user)
    .where(where);

  const page = clampPage(input.page, total, input.pageSize);
  const rows = await database
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      verified: user.emailVerified,
      twoFactor: user.twoFactorEnabled,
      role: user.role,
      banned: user.banned,
    })
    .from(user)
    .where(where)
    .orderBy(desc(user.createdAt), desc(user.id))
    .limit(input.pageSize)
    .offset((page - 1) * input.pageSize);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt.toISOString(),
      verified: row.verified,
      twoFactor: Boolean(row.twoFactor),
      role: row.role ?? "user",
      banned: Boolean(row.banned),
    })),
    total,
    page,
    pageSize: input.pageSize,
    pageCount: pageCount(total, input.pageSize),
  };
}

export type UsersStats = { total: number; verified: number; admins: number; suspended: number };

/** Compteurs du haut de page, calculés sur tous les comptes (et non sur la seule page affichée). */
export async function getUsersStats(customRoleSlugs: string[]): Promise<UsersStats> {
  const adminSlugs = [...(ADMIN_ROLES as string[]), ...customRoleSlugs];
  const slugList = sql.join(
    adminSlugs.map((slug) => sql`${slug}`),
    sql`, `,
  );
  const [row] = await getServiceDb()
    .select({
      total: sql<number>`count(*)::int`,
      verified: sql<number>`(count(*) filter (where ${user.emailVerified}))::int`,
      admins: sql<number>`(count(*) filter (where string_to_array(replace(coalesce(${user.role}, 'user'), ' ', ''), ',') && array[${slugList}]::text[]))::int`,
      suspended: sql<number>`(count(*) filter (where coalesce(${user.banned}, false)))::int`,
    })
    .from(user);
  return row ?? { total: 0, verified: 0, admins: 0, suspended: 0 };
}
