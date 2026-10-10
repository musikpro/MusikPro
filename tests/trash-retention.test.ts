import { describe, expect, it } from "vitest";
import {
  TRASH_RETENTION_DEFAULT_DAYS,
  TRASH_RETENTION_MAX_DAYS,
  TRASH_RETENTION_MIN_DAYS,
  daysRemaining,
  expiryCutoff,
  normalizeRetentionDays,
  purgeDate,
} from "@/lib/trash/retention";

const DAY = 24 * 60 * 60 * 1000;

describe("délai de conservation de la corbeille", () => {
  it("vaut 30 jours par défaut et reste dans les bornes", () => {
    expect(TRASH_RETENTION_DEFAULT_DAYS).toBe(30);
    expect(normalizeRetentionDays(undefined)).toBe(30);
    expect(normalizeRetentionDays("abc")).toBe(30);
    expect(normalizeRetentionDays(0)).toBe(TRASH_RETENTION_MIN_DAYS);
    expect(normalizeRetentionDays(-5)).toBe(TRASH_RETENTION_MIN_DAYS);
    expect(normalizeRetentionDays(9999)).toBe(TRASH_RETENTION_MAX_DAYS);
    expect(normalizeRetentionDays("45")).toBe(45);
    expect(normalizeRetentionDays(7.4)).toBe(7);
  });

  it("calcule la date de purge et les jours restants", () => {
    const deletedAt = new Date("2026-10-10T12:00:00Z");
    expect(purgeDate(deletedAt, 30).toISOString()).toBe("2026-11-09T12:00:00.000Z");
    expect(daysRemaining(deletedAt, 30, deletedAt)).toBe(30);
    expect(daysRemaining(deletedAt, 30, new Date(deletedAt.getTime() + 29 * DAY + 1))).toBe(1);
    expect(daysRemaining(deletedAt, 30, new Date(deletedAt.getTime() + 30 * DAY))).toBe(0);
    expect(daysRemaining(deletedAt, 30, new Date(deletedAt.getTime() + 90 * DAY))).toBe(0);
  });

  it("donne la limite avant laquelle un élément est périmé", () => {
    const now = new Date("2026-11-10T00:00:00Z");
    expect(expiryCutoff(30, now).toISOString()).toBe("2026-10-11T00:00:00.000Z");
    // Un délai invalide retombe sur 30 jours : jamais de purge immédiate par erreur.
    expect(expiryCutoff(Number.NaN, now).toISOString()).toBe("2026-10-11T00:00:00.000Z");
  });
});
