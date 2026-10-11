/**
 * Limites d'affichage côté client, réglées par le propriétaire : longueur maximale des titres de chansons
 * (landing « Ils ont créé avec MusikPro », « Bibliothèque populaire », Tendances du dashboard) et nombre de
 * styles musicaux montrés dans « Tous les styles africains ». Un seul mécanisme, partagé par les trois zones.
 */
export const TITLE_MAX_CHARS_DEFAULT = 40;
export const TITLE_MAX_CHARS_MIN = 10;
export const TITLE_MAX_CHARS_MAX = 120;

export const MUSIC_STYLES_MAX_COUNT_DEFAULT = 12;
export const MUSIC_STYLES_MAX_COUNT_MIN = 4;
export const MUSIC_STYLES_MAX_COUNT_MAX = 60;

export type DisplayLimits = {
  landingShowcaseTitleMaxChars: number;
  landingLibraryTitleMaxChars: number;
  trendingTitleMaxChars: number;
  landingMusicStylesMaxCount: number;
};

export const DISPLAY_LIMITS_DEFAULTS: DisplayLimits = {
  landingShowcaseTitleMaxChars: TITLE_MAX_CHARS_DEFAULT,
  landingLibraryTitleMaxChars: TITLE_MAX_CHARS_DEFAULT,
  trendingTitleMaxChars: TITLE_MAX_CHARS_DEFAULT,
  landingMusicStylesMaxCount: MUSIC_STYLES_MAX_COUNT_DEFAULT,
};

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function normalizeTitleMaxChars(value: unknown): number {
  return clampInteger(value, TITLE_MAX_CHARS_DEFAULT, TITLE_MAX_CHARS_MIN, TITLE_MAX_CHARS_MAX);
}

export function normalizeMusicStylesMaxCount(value: unknown): number {
  return clampInteger(value, MUSIC_STYLES_MAX_COUNT_DEFAULT, MUSIC_STYLES_MAX_COUNT_MIN, MUSIC_STYLES_MAX_COUNT_MAX);
}

/** Coupe un titre à `maxChars` caractères en ajoutant « … » ; le titre complet reste dans la base. */
export function truncateTitle(title: string, maxChars: number): string {
  const chars = Array.from(title.trim());
  if (chars.length <= maxChars) return chars.join("");
  return `${chars.slice(0, Math.max(1, maxChars)).join("").trimEnd()}…`;
}
