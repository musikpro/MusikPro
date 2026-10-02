"use server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { countryLanguages, languages, localizationSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { getCurrencyCatalog } from "@/lib/credit-plans/currencies-server";
import { describeRefreshError } from "@/lib/i18n/refresh-errors";
import { runTranslationsRefresh } from "@/lib/i18n/refresh-translations";
import { rateLimit } from "@/lib/security/rate-limit";
import { COUNTRIES_REFERENCE } from "@/lib/languages/countries-reference";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { withAdminNotice } from "@/lib/admin/notice-redirect";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

export type LanguageActionState = { ok: boolean; message: string } | null;

const languageSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    nativeName: z.string().trim().min(2).max(60),
    code: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z]{2,3}(?:-[a-z]{2})?$/),
    flag: z.string().trim().min(1).max(12),
    interfaceEnabled: z.enum(["true", "false"]),
    lyricsEnabled: z.enum(["true", "false"]),
    interfaceOrder: z.coerce.number().int().min(0).max(999),
    lyricsOrder: z.coerce.number().int().min(0).max(999),
  })
  .refine((value) => value.interfaceEnabled === "true" || value.lyricsEnabled === "true", {
    message: "Active au moins un usage.",
  });
const idSchema = z.object({ id: z.string().trim().min(1).max(120) });
const toggleSchema = idSchema.extend({ scope: z.enum(["interface", "lyrics"]) });
const countryLanguageSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  languageCode: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2,3}(?:-[a-z]{2})?$/),
  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
});
const countryCodeSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
});
const defaultLanguageSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2,3}(?:-[a-z]{2})?$/),
});
function refresh() {
  ["/admin/languages", "/dashboard", "/dashboard/create/parameters", "/demo"].forEach((path) => revalidatePath(path));
}
export async function createLanguage(_previous: LanguageActionState, formData: FormData): Promise<LanguageActionState> {
  const session = await requireAdmin();
  let parsed: z.infer<typeof languageSchema>;
  try {
    parsed = languageSchema.parse(Object.fromEntries(formData));
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’ajouter cette langue.") };
  }
  const id = randomUUID();
  await getServiceDb()
    .insert(languages)
    .values({
      ...parsed,
      id,
      interfaceEnabled: parsed.interfaceEnabled === "true",
      lyricsEnabled: parsed.lyricsEnabled === "true",
    });
  await writeAuditLog({
    action: "language.created",
    actorId: session.user.id,
    targetType: "language",
    targetId: id,
    metadata: { code: parsed.code },
  });
  refresh();
  redirect(withAdminNotice("/admin/languages", "Langue ajoutée."));
}
export async function updateLanguage(_previous: LanguageActionState, formData: FormData): Promise<LanguageActionState> {
  const session = await requireAdmin();
  try {
    const parsed = languageSchema.extend({ id: z.string().trim().min(1).max(120) }).parse(Object.fromEntries(formData));
    await getServiceDb()
      .update(languages)
      .set({
        ...parsed,
        interfaceEnabled: parsed.interfaceEnabled === "true",
        lyricsEnabled: parsed.lyricsEnabled === "true",
        updatedAt: new Date(),
      })
      .where(eq(languages.id, parsed.id));
    await writeAuditLog({
      action: "language.updated",
      actorId: session.user.id,
      targetType: "language",
      targetId: parsed.id,
      metadata: { code: parsed.code },
    });
    refresh();
    return { ok: true, message: "Langue enregistrée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer cette langue.") };
  }
}
export async function toggleLanguageScope(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = toggleSchema.parse(Object.fromEntries(formData));
    const [row] = await getServiceDb().select().from(languages).where(eq(languages.id, parsed.id)).limit(1);
    if (!row) return { ok: false, message: "Langue introuvable." };
    const patch =
      parsed.scope === "interface"
        ? { interfaceEnabled: !row.interfaceEnabled }
        : { lyricsEnabled: !row.lyricsEnabled };
    await getServiceDb()
      .update(languages)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(languages.id, parsed.id));
    await writeAuditLog({
      action: "language.scope.changed",
      actorId: session.user.id,
      targetType: "language",
      targetId: parsed.id,
      metadata: { scope: parsed.scope },
    });
    refresh();
    return { ok: true, message: "Disponibilité mise à jour." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier cette langue.") };
  }
}
export async function deleteLanguage(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { id } = idSchema.parse(Object.fromEntries(formData));
    await getServiceDb().delete(languages).where(eq(languages.id, id));
    await writeAuditLog({ action: "language.deleted", actorId: session.user.id, targetType: "language", targetId: id });
    refresh();
    return { ok: true, message: "Langue supprimée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer cette langue.") };
  }
}

export async function setDefaultLanguage(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { code } = defaultLanguageSchema.parse(Object.fromEntries(formData));
    const [language] = await getServiceDb().select().from(languages).where(eq(languages.code, code)).limit(1);
    if (!language) return { ok: false, message: "Langue introuvable." };
    await getServiceDb()
      .insert(localizationSettings)
      .values({ id: "global", defaultLanguageCode: code })
      .onConflictDoUpdate({
        target: localizationSettings.id,
        set: { defaultLanguageCode: code, updatedAt: new Date() },
      });
    await writeAuditLog({
      action: "localization.default_language.changed",
      actorId: session.user.id,
      targetType: "localization_settings",
      targetId: "global",
      metadata: { code },
    });
    refresh();
    return { ok: true, message: "Langue par défaut mise à jour." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de changer la langue par défaut.") };
  }
}

export async function setCountryLanguage(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = countryLanguageSchema.parse(Object.fromEntries(formData));
    const catalog = await getCurrencyCatalog();
    if (!catalog.some((currency) => currency.code === parsed.currencyCode)) {
      return { ok: false, message: `La monnaie ${parsed.currencyCode} n’existe pas dans le catalogue des monnaies.` };
    }
    const reference = COUNTRIES_REFERENCE.find((country) => country.code === parsed.countryCode);
    const countryName = reference?.name ?? parsed.countryCode;
    const flag = reference?.flag ?? "🌍";
    await getServiceDb()
      .insert(countryLanguages)
      .values({
        countryCode: parsed.countryCode,
        countryName,
        flag,
        languageCode: parsed.languageCode,
        currencyCode: parsed.currencyCode,
      })
      .onConflictDoUpdate({
        target: countryLanguages.countryCode,
        set: {
          countryName,
          flag,
          languageCode: parsed.languageCode,
          currencyCode: parsed.currencyCode,
          updatedAt: new Date(),
        },
      });
    await writeAuditLog({
      action: "country_language.set",
      actorId: session.user.id,
      targetType: "country_language",
      targetId: parsed.countryCode,
      metadata: { languageCode: parsed.languageCode, currencyCode: parsed.currencyCode },
    });
    refresh();
    return { ok: true, message: "Association pays, langue et devise enregistrée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’associer ce pays.") };
  }
}

export async function removeCountryLanguage(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { countryCode } = countryCodeSchema.parse(Object.fromEntries(formData));
    await getServiceDb().delete(countryLanguages).where(eq(countryLanguages.countryCode, countryCode));
    await writeAuditLog({
      action: "country_language.removed",
      actorId: session.user.id,
      targetType: "country_language",
      targetId: countryCode,
    });
    refresh();
    return { ok: true, message: "Association retirée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de retirer cette association.") };
  }
}

async function guardRefresh(userId: string) {
  const limit = await rateLimit(`admin:translations-refresh:${userId}`, 300, 3600);
  if (limit.backend === "unavailable") throw new Error("Le contrôle de débit est indisponible.");
  if (!limit.success) throw new Error("RATE_LIMITED");
}

/**
 * Une passe incrémentale de « Actualiser les traductions » : textes fixes de l'interface et tables
 * catalogue (colonne `translations`) via le fournisseur IA connecté — voir lib/i18n/refresh-translations.ts.
 * Le bouton relance l'action tant qu'il reste des textes (`remaining`).
 */
export async function refreshCatalogTranslations(): Promise<
  ({ ok: true } & Awaited<ReturnType<typeof runTranslationsRefresh>> & { error: null }) | { ok: false; message: string }
> {
  // Hors du try : requireAdmin() redirige un non-admin, la redirection ne doit pas être avalée.
  const session = await requireAdmin();
  try {
    await guardRefresh(session.user.id);
    const result = await runTranslationsRefresh();
    if (result.translated > 0) {
      await writeAuditLog({
        action: "catalog.translations.refreshed",
        actorId: session.user.id,
        targetType: "localization_settings",
        targetId: "global",
        metadata: { ...result.counts, translated: result.translated, remaining: result.remaining },
      });
      refresh();
    }
    if (result.error) {
      return { ok: false, message: describeRefreshError(result.error, result.translated) };
    }
    return { ok: true, ...result, error: null };
  } catch (error) {
    return { ok: false, message: describeRefreshError(error, 0) };
  }
}
