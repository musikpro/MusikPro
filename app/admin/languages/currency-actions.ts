"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { countryLanguages, currencies, currencySettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { BASE_CURRENCY_CODE, PIVOT_CURRENCY_CODE } from "@/lib/credit-plans/currency";
import { fetchUsdRates, fxProviderIdSchema } from "@/lib/credit-plans/fx-rates";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "code ISO à 3 lettres attendu (ex. EUR)");
const rateSchema = z.coerce
  .number({ message: "taux invalide" })
  .positive("le taux doit être supérieur à 0")
  .max(1_000_000_000, "taux trop élevé");

const currencyFieldsSchema = z.object({
  label: z.string().trim().min(2, "nom trop court").max(80),
  symbol: z.string().trim().min(1, "symbole requis").max(8),
  unitsPerUsd: rateSchema,
  decimals: z.coerce.number().int().min(0).max(4),
});
const createCurrencySchema = currencyFieldsSchema.extend({ code: codeSchema });
const saveCurrencySchema = currencyFieldsSchema.extend({ code: codeSchema });
const codeOnlySchema = z.object({ code: codeSchema });

function refresh() {
  ["/admin/languages", "/dashboard/credits", "/dashboard/create/pack", "/dashboard"].forEach((path) =>
    revalidatePath(path),
  );
}

function isLocked(code: string) {
  return code === BASE_CURRENCY_CODE;
}

export async function createCurrency(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = createCurrencySchema.parse(Object.fromEntries(formData));
    // Rejects codes the runtime cannot format only at display time (a fallback covers that), but a
    // currency code has to be a real ISO code to be useful with payment providers.
    const db = getServiceDb();
    const [existing] = await db.select({ code: currencies.code }).from(currencies).where(eq(currencies.code, parsed.code));
    if (existing) return { ok: false, message: `La monnaie ${parsed.code} existe déjà.` };
    const [{ total }] = await db.select({ total: count() }).from(currencies);
    await db.insert(currencies).values({
      code: parsed.code,
      label: parsed.label,
      symbol: parsed.symbol,
      unitsPerUsd: parsed.unitsPerUsd,
      decimals: parsed.decimals,
      enabled: true,
      autoUpdate: formData.get("autoUpdate") === "on",
      sortOrder: (total + 1) * 10,
    });
    await writeAuditLog({
      action: "currency.created",
      actorId: session.user.id,
      targetType: "currency",
      targetId: parsed.code,
    });
    refresh();
    return { ok: true, message: `Monnaie ${parsed.code} ajoutée.` };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’ajouter cette monnaie.") };
  }
}

export async function saveCurrency(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = saveCurrencySchema.parse(Object.fromEntries(formData));
    const result = await getServiceDb()
      .update(currencies)
      .set({
        label: parsed.label,
        symbol: parsed.symbol,
        unitsPerUsd: parsed.code === PIVOT_CURRENCY_CODE ? 1 : parsed.unitsPerUsd,
        decimals: parsed.decimals,
        autoUpdate: parsed.code === PIVOT_CURRENCY_CODE ? false : formData.get("autoUpdate") === "on",
        updatedAt: new Date(),
      })
      .where(eq(currencies.code, parsed.code))
      .returning({ code: currencies.code });
    if (!result.length) return { ok: false, message: "Monnaie introuvable." };
    await writeAuditLog({
      action: "currency.updated",
      actorId: session.user.id,
      targetType: "currency",
      targetId: parsed.code,
      metadata: { unitsPerUsd: parsed.unitsPerUsd },
    });
    refresh();
    return { ok: true, message: `Monnaie ${parsed.code} enregistrée.` };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer cette monnaie.") };
  }
}

export async function toggleCurrency(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { code } = codeOnlySchema.parse(Object.fromEntries(formData));
    if (isLocked(code)) return { ok: false, message: "Le franc CFA (XOF) est la monnaie par défaut : il reste toujours affiché." };
    const db = getServiceDb();
    const [row] = await db.select({ enabled: currencies.enabled }).from(currencies).where(eq(currencies.code, code));
    if (!row) return { ok: false, message: "Monnaie introuvable." };
    await db.update(currencies).set({ enabled: !row.enabled, updatedAt: new Date() }).where(eq(currencies.code, code));
    await writeAuditLog({
      action: row.enabled ? "currency.hidden" : "currency.shown",
      actorId: session.user.id,
      targetType: "currency",
      targetId: code,
    });
    refresh();
    return { ok: true, message: row.enabled ? `${code} masquée pour les clients.` : `${code} affichée pour les clients.` };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier l’affichage de cette monnaie.") };
  }
}

export async function deleteCurrency(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { code } = codeOnlySchema.parse(Object.fromEntries(formData));
    if (isLocked(code) || code === PIVOT_CURRENCY_CODE) {
      return { ok: false, message: `${code} sert de base à la conversion et ne peut pas être supprimée.` };
    }
    const db = getServiceDb();
    const [{ total }] = await db
      .select({ total: count() })
      .from(countryLanguages)
      .where(eq(countryLanguages.currencyCode, code));
    if (total > 0) {
      return {
        ok: false,
        message: `${code} est associée à ${total} pays : change d’abord leur monnaie, ou masque-la plutôt.`,
      };
    }
    await db.delete(currencies).where(eq(currencies.code, code));
    await writeAuditLog({
      action: "currency.deleted",
      actorId: session.user.id,
      targetType: "currency",
      targetId: code,
    });
    refresh();
    return { ok: true, message: `Monnaie ${code} supprimée.` };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer cette monnaie.") };
  }
}

export async function saveRateProvider(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const rateProvider = fxProviderIdSchema.parse(formData.get("rateProvider"));
    await getServiceDb()
      .insert(currencySettings)
      .values({ id: "global", rateProvider })
      .onConflictDoUpdate({ target: currencySettings.id, set: { rateProvider, updatedAt: new Date() } });
    await writeAuditLog({
      action: "currency.rate_provider.set",
      actorId: session.user.id,
      targetType: "currency_settings",
      targetId: "global",
      metadata: { rateProvider },
    });
    refresh();
    return { ok: true, message: "Service de conversion enregistré." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer le service de conversion.") };
  }
}

/** Refreshes `unitsPerUsd` of every currency flagged "auto" from the international rate services. */
export async function syncCurrencyRates(_previous: AdminActionState, _formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
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
    if (!updated.length) {
      return { ok: false, message: `Aucun taux récupéré. ${errors.join(" · ")}`.trim() };
    }
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
        set: { lastSyncedAt: new Date(), lastSyncProvider: providersUsed, lastSyncMessage: message, updatedAt: new Date() },
      });
    await writeAuditLog({
      action: "currency.rates.synced",
      actorId: session.user.id,
      targetType: "currency_settings",
      targetId: "global",
      metadata: { updated: updated.length, missing },
    });
    refresh();
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’actualiser les taux de change.") };
  }
}
