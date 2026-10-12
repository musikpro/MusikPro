import "server-only";

import { sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { FUNNEL_EVENT } from "@/lib/analytics/funnel";
import { summarizeGuestLinkStats, type GuestLinkStats } from "./stats-summary";

/** Entrées du mode invité par lien (événements `guest_entry` de l'entonnoir), calculées en base : jamais de donnée personnelle. */
export async function getGuestLinkStats(): Promise<Map<string, GuestLinkStats>> {
  const db = getServiceDb();
  const totals = await db.execute(sql`
    SELECT metadata->>'linkId' AS link_id,
           count(*)::int AS total,
           count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS last_7_days,
           count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS last_30_days,
           count(*) FILTER (WHERE metadata->>'returning' = 'true')::int AS returning_visits,
           max(created_at) AS last_entry_at
    FROM funnel_events
    WHERE event = ${FUNNEL_EVENT.GUEST_ENTRY} AND metadata->>'linkId' IS NOT NULL
    GROUP BY 1`);
  const sources = await db.execute(sql`
    SELECT metadata->>'linkId' AS link_id,
           coalesce(nullif(metadata->>'utm_source', ''), nullif(metadata->>'referrer_host', ''), 'direct') AS source,
           count(*)::int AS entries
    FROM funnel_events
    WHERE event = ${FUNNEL_EVENT.GUEST_ENTRY} AND metadata->>'linkId' IS NOT NULL
      AND created_at > now() - interval '30 days'
    GROUP BY 1, 2`);
  return summarizeGuestLinkStats(
    totals.rows as Parameters<typeof summarizeGuestLinkStats>[0],
    sources.rows as Parameters<typeof summarizeGuestLinkStats>[1],
  );
}
