import "server-only";

import { sql } from "drizzle-orm";
import { getServiceDb } from "@/db";

export type DailyActivityPoint = {
  day: string;
  newUsers: number;
  songs: number;
  revenue: number;
};

/**
 * Rolling window of exactly `days` calendar days (including today), zero-filled via
 * generate_series so every chart always renders the same number of columns regardless of
 * whether a given day had any activity — the "définition métier stable des périodes" the
 * analytics page used to be missing before this was connected.
 */
export async function getDailyActivitySeries(days = 30): Promise<DailyActivityPoint[]> {
  const db = getServiceDb();
  const result = await db.execute(sql`
    select
      to_char(gs::date, 'YYYY-MM-DD') as day,
      coalesce(u.cnt, 0)::int as new_users,
      coalesce(j.cnt, 0)::int as songs,
      coalesce(p.revenue, 0)::float as revenue
    from generate_series(current_date - ${days - 1}::int * interval '1 day', current_date, interval '1 day') as gs
    left join (
      select date_trunc('day', created_at) as day, count(*) as cnt from "user" group by 1
    ) u on u.day = gs
    left join (
      select date_trunc('day', created_at) as day, count(*) as cnt from music_generation_jobs group by 1
    ) j on j.day = gs
    left join (
      select date_trunc('day', created_at) as day, sum(amount) as revenue from payments where status = 'paid' group by 1
    ) p on p.day = gs
    order by gs
  `);
  return result.rows.map((row) => {
    const record = row as { day: string; new_users: number | string; songs: number | string; revenue: number | string };
    return {
      day: record.day,
      newUsers: Number(record.new_users) || 0,
      songs: Number(record.songs) || 0,
      revenue: Number(record.revenue) || 0,
    };
  });
}

export type PaymentCountryBreakdown = {
  country: string;
  paymentsCount: number;
  paidRevenue: number;
};

/**
 * Country is only recorded on the payments table (not on the user account), so this reflects
 * where checkout attempts originate, not the full user base — surfaced honestly with its own
 * label in the UI rather than presented as a user-geography breakdown.
 */
export async function getPaymentCountryBreakdown(limit = 10): Promise<PaymentCountryBreakdown[]> {
  const db = getServiceDb();
  const result = await db.execute(sql`
    select
      country,
      count(*)::int as payments_count,
      coalesce(sum(case when status = 'paid' then amount else 0 end), 0)::float as paid_revenue
    from payments
    where country is not null
    group by country
    order by payments_count desc
    limit ${limit}
  `);
  return result.rows.map((row) => {
    const record = row as { country: string; payments_count: number | string; paid_revenue: number | string };
    return {
      country: record.country,
      paymentsCount: Number(record.payments_count) || 0,
      paidRevenue: Number(record.paid_revenue) || 0,
    };
  });
}

const regionNames = new Intl.DisplayNames(["fr"], { type: "region" });

export function countryDisplayName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export function countryFlagEmoji(code: string): string {
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "🌍";
  return String.fromCodePoint(...[...upper].map((char) => 127397 + char.charCodeAt(0)));
}
