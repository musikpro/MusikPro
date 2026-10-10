/** Délais de conservation de la corbeille du tableau de bord propriétaire (logique pure, sans accès base). */
export const TRASH_RETENTION_DEFAULT_DAYS = 30;
export const TRASH_RETENTION_MIN_DAYS = 1;
export const TRASH_RETENTION_MAX_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ramène une valeur quelconque (base, saisie) à un nombre entier de jours dans les bornes, sinon au défaut (30). */
export function normalizeRetentionDays(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return TRASH_RETENTION_DEFAULT_DAYS;
  return Math.min(TRASH_RETENTION_MAX_DAYS, Math.max(TRASH_RETENTION_MIN_DAYS, Math.round(number)));
}

/** Date de purge automatique d'un élément mis en corbeille à `deletedAt`. */
export function purgeDate(deletedAt: Date, retentionDays: number): Date {
  return new Date(deletedAt.getTime() + normalizeRetentionDays(retentionDays) * DAY_MS);
}

/** Jours entiers restants avant la purge (0 quand l'échéance est dépassée ou imminente), arrondis au supérieur. */
export function daysRemaining(deletedAt: Date, retentionDays: number, now: Date = new Date()): number {
  const remaining = purgeDate(deletedAt, retentionDays).getTime() - now.getTime();
  return remaining <= 0 ? 0 : Math.ceil(remaining / DAY_MS);
}

/** Date limite avant laquelle un élément supprimé doit être purgé : tout ce qui a été supprimé avant est périmé. */
export function expiryCutoff(retentionDays: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - normalizeRetentionDays(retentionDays) * DAY_MS);
}
