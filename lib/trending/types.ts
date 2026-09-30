/** Le widget « Tendances » affiche exactement deux cartes, choisies à la main depuis /admin/trending. */
export const TRENDING_COUNT = 2;
/** Nombre maximal de chansons assignables (une par carte). */
export const TRENDING_POOL_SIZE = TRENDING_COUNT;

export type TrendingSettingsValue = {
  /** Chansons choisies à la main, dans l'ordre d'affichage (songGroupId). */
  manualSelection: string[];
  /** Pochette (URL du média) attribuée à chaque chanson : { [songGroupId]: url }. */
  coverOverrides: Record<string, string>;
};
