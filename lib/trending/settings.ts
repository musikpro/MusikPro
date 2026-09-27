import "server-only";

import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { trendingSettings } from "@/db/schema";
import { TRENDING_COUNT_OPTIONS, type TrendingCount, type TrendingSettingsValue } from "./types";

export { TRENDING_COUNT_OPTIONS, TRENDING_POOL_SIZE } from "./types";
export type { TrendingCount, TrendingMode, TrendingSettingsValue } from "./types";

const DEFAULT_SETTINGS: TrendingSettingsValue = { mode: "auto", count: 3, randomize: false, manualSelection: [] };

function normalizeCount(value: number): TrendingCount {
  return (TRENDING_COUNT_OPTIONS as readonly number[]).includes(value) ? (value as TrendingCount) : 3;
}

/** Réglage global : mode (auto/manuel), nombre affiché, tirage aléatoire ou non, vivier manuel ordonné. */
export async function getTrendingSettings(): Promise<TrendingSettingsValue> {
  try {
    const [row] = await getServiceDb()
      .select({
        mode: trendingSettings.mode,
        count: trendingSettings.count,
        randomize: trendingSettings.randomize,
        manualSelection: trendingSettings.manualSelection,
      })
      .from(trendingSettings)
      .where(eq(trendingSettings.id, "global"))
      .limit(1);
    if (!row) return DEFAULT_SETTINGS;
    return {
      mode: row.mode === "manual" ? "manual" : "auto",
      count: normalizeCount(row.count),
      randomize: Boolean(row.randomize),
      manualSelection: Array.isArray(row.manualSelection) ? (row.manualSelection as string[]) : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
