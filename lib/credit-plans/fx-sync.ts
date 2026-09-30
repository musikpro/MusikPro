import "server-only";

import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { currencies, currencySettings } from "@/db/schema";
import { PIVOT_CURRENCY_CODE } from "./currency";
import { fetchUsdRates, fxProviderIdSchema } from "./fx-rates";

export type FxSyncOutcome =
  { ok: true; message: string; updated: number; missing: string[] } | { ok: false; message: string };

/**
 * Refreshes `unitsPerUsd` of every currency flagged "auto" from the international rate services and
 * records the run in currency_settings. Shared by the admin button ("Actualiser les taux
 * maintenant") and the daily cron (/api/cron/refresh-currency-rates). A failed run leaves the
 * stored rates untouched.
 */
export async function syncAutoCurrencyRates(): Promise<FxSyncOutcome> {
  const db = getServiceDb();
  const [settings] = await db.select().from(currencySettings).where(eq(currencySettings.id, "global"));
  const rows = await db.select().from(currencies);
  const targets = rows.filter((row) => row.autoUpdate && row.code !== PIVOT_CURRENCY_CODE);
  if (!targets.length) return { ok: false, message: "Aucune monnaie n’est en mise à jour automatique." };

  const { rates, errors } = await fetchUsdRates(
    targets.map((row) => row.code),
    fxProviderIdSchema.catch("auto").parse(settings?.rateProvider),
  );
  const updated = targets.filter((row) => rates[row.code]);
  if (!updated.length) return { ok: false, message: `Aucun taux récupéré. ${errors.join(" · ")}`.trim() };

  const providersUsed = [...new Set(updated.map((row) => rates[row.code].provider))].join(", ");
  const missing = targets.filter((row) => !rates[row.code]).map((row) => row.code);
  const message = `${updated.length} taux mis à jour via ${providersUsed}${missing.length ? ` · non fournis : ${missing.join(", ")}` : ""}`;
  for (const row of updated) {
    await db
      .update(currencies)
      .set({ unitsPerUsd: rates[row.code].unitsPerUsd, updatedAt: new Date() })
      .where(eq(currencies.code, row.code));
  }
  await db
    .insert(currencySettings)
    .values({ id: "global", lastSyncedAt: new Date(), lastSyncProvider: providersUsed, lastSyncMessage: message })
    .onConflictDoUpdate({
      target: currencySettings.id,
      set: {
        lastSyncedAt: new Date(),
        lastSyncProvider: providersUsed,
        lastSyncMessage: message,
        updatedAt: new Date(),
      },
    });
  return { ok: true, message, updated: updated.length, missing };
}
