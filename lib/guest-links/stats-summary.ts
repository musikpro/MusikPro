/** Mise en forme pure des compteurs d'entrées par lien (testable sans base). */
export type GuestLinkStats = {
  total: number;
  last7Days: number;
  last30Days: number;
  returningVisits: number;
  lastEntryAt: Date | null;
  /** Meilleures sources sur 30 jours (utm_source, sinon domaine du référent, sinon « direct »). */
  topSources: { source: string; entries: number }[];
};

type TotalRow = {
  link_id: string;
  total: number;
  last_7_days: number;
  last_30_days: number;
  returning_visits: number;
  last_entry_at: string | Date | null;
};
type SourceRow = { link_id: string; source: string; entries: number };

const TOP_SOURCES = 3;

export function emptyGuestLinkStats(): GuestLinkStats {
  return { total: 0, last7Days: 0, last30Days: 0, returningVisits: 0, lastEntryAt: null, topSources: [] };
}

export function summarizeGuestLinkStats(totals: TotalRow[], sources: SourceRow[]): Map<string, GuestLinkStats> {
  const byLink = new Map<string, GuestLinkStats>();
  for (const row of totals) {
    byLink.set(row.link_id, {
      total: Number(row.total),
      last7Days: Number(row.last_7_days),
      last30Days: Number(row.last_30_days),
      returningVisits: Number(row.returning_visits),
      lastEntryAt: row.last_entry_at ? new Date(row.last_entry_at) : null,
      topSources: [],
    });
  }
  for (const row of sources) {
    const stats = byLink.get(row.link_id) ?? emptyGuestLinkStats();
    stats.topSources.push({ source: row.source, entries: Number(row.entries) });
    byLink.set(row.link_id, stats);
  }
  for (const stats of byLink.values()) {
    stats.topSources.sort((a, b) => b.entries - a.entries || a.source.localeCompare(b.source)).splice(TOP_SOURCES);
  }
  return byLink;
}
