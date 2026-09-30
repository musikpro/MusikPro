import "server-only";

import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { trendingSettings } from "@/db/schema";
import { TRENDING_POOL_SIZE, type TrendingSettingsValue } from "./types";

export { TRENDING_COUNT, TRENDING_POOL_SIZE } from "./types";
export type { TrendingSettingsValue } from "./types";

const DEFAULT_SETTINGS: TrendingSettingsValue = { manualSelection: [], coverOverrides: {} };

function normalizeCovers(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0,
    ),
  );
}

/** Réglage global : chansons choisies à la main (2 au maximum) et pochette attribuée à chacune. */
export async function getTrendingSettings(): Promise<TrendingSettingsValue> {
  try {
    const [row] = await getServiceDb()
      .select({
        manualSelection: trendingSettings.manualSelection,
        coverOverrides: trendingSettings.coverOverrides,
      })
      .from(trendingSettings)
      .where(eq(trendingSettings.id, "global"))
      .limit(1);
    if (!row) return DEFAULT_SETTINGS;
    return {
      manualSelection: Array.isArray(row.manualSelection)
        ? (row.manualSelection as string[]).slice(0, TRENDING_POOL_SIZE)
        : [],
      coverOverrides: normalizeCovers(row.coverOverrides),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
