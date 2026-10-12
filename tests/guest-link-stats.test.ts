import { describe, expect, it } from "vitest";
import { emptyGuestLinkStats, summarizeGuestLinkStats } from "@/lib/guest-links/stats-summary";

describe("compteurs d'entrées par lien", () => {
  it("regroupe les totaux et garde les trois meilleures sources, triées", () => {
    const stats = summarizeGuestLinkStats(
      [
        {
          link_id: "a",
          total: 10,
          last_7_days: 4,
          last_30_days: 9,
          returning_visits: 2,
          last_entry_at: "2026-10-12T20:00:00Z",
        },
      ],
      [
        { link_id: "a", source: "facebook", entries: 5 },
        { link_id: "a", source: "tiktok", entries: 7 },
        { link_id: "a", source: "direct", entries: 1 },
        { link_id: "a", source: "instagram", entries: 5 },
      ],
    );
    const a = stats.get("a")!;
    expect(a.total).toBe(10);
    expect(a.last7Days).toBe(4);
    expect(a.lastEntryAt?.toISOString()).toBe("2026-10-12T20:00:00.000Z");
    expect(a.topSources).toEqual([
      { source: "tiktok", entries: 7 },
      { source: "facebook", entries: 5 },
      { source: "instagram", entries: 5 },
    ]);
  });

  it("accepte des compteurs textuels et une entrée sans total", () => {
    const stats = summarizeGuestLinkStats(
      [
        {
          link_id: "b",
          total: "3" as unknown as number,
          last_7_days: 0,
          last_30_days: 0,
          returning_visits: 0,
          last_entry_at: null,
        },
      ],
      [{ link_id: "c", source: "direct", entries: 2 }],
    );
    expect(stats.get("b")?.total).toBe(3);
    expect(stats.get("c")?.total).toBe(0);
    expect(emptyGuestLinkStats().topSources).toEqual([]);
  });
});
