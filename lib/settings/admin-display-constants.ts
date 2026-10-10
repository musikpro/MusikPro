/** Éléments par page des listes paginées du tableau de bord propriétaire : valeur par défaut et bornes des réglages. */
export const GENERATIONS_PER_PAGE_DEFAULT = 50;
export const GENERATIONS_PER_PAGE_MIN = 10;
export const GENERATIONS_PER_PAGE_MAX = 200;

export const USERS_PER_PAGE_DEFAULT = 50;
export const USERS_PER_PAGE_MIN = 10;
export const USERS_PER_PAGE_MAX = 200;

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

/** Ramène une valeur quelconque (base, saisie) à un nombre entier dans les bornes, sinon à la valeur par défaut. */
export function normalizeGenerationsPerPage(value: unknown): number {
  return clampInteger(value, GENERATIONS_PER_PAGE_DEFAULT, GENERATIONS_PER_PAGE_MIN, GENERATIONS_PER_PAGE_MAX);
}

export function normalizeUsersPerPage(value: unknown): number {
  return clampInteger(value, USERS_PER_PAGE_DEFAULT, USERS_PER_PAGE_MIN, USERS_PER_PAGE_MAX);
}
