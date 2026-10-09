/** Chansons affichées par page sur /admin/generations : valeur par défaut et bornes du réglage. */
export const GENERATIONS_PER_PAGE_DEFAULT = 50;
export const GENERATIONS_PER_PAGE_MIN = 10;
export const GENERATIONS_PER_PAGE_MAX = 200;

/** Ramène une valeur quelconque (base, saisie) à un nombre entier dans les bornes, sinon à la valeur par défaut. */
export function normalizeGenerationsPerPage(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return GENERATIONS_PER_PAGE_DEFAULT;
  return Math.min(GENERATIONS_PER_PAGE_MAX, Math.max(GENERATIONS_PER_PAGE_MIN, Math.round(number)));
}
