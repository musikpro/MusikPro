export const TRENDING_COUNT_OPTIONS = [2, 3] as const;
export type TrendingCount = (typeof TRENDING_COUNT_OPTIONS)[number];
export type TrendingMode = "auto" | "manual";

/** Max size of the candidate pool (manual picks, or top-N by plays in automatic mode) that `count` is drawn from when `randomize` is on. */
export const TRENDING_POOL_SIZE = 10;

export type TrendingSettingsValue = {
  mode: TrendingMode;
  count: TrendingCount;
  /** When true, `count` songs are drawn at random from the pool on every render instead of always the same ones. */
  randomize: boolean;
  manualSelection: string[];
};
