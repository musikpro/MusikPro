import "server-only";
import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { uiTranslations } from "@/db/schema";
import { TRANSLATION_LOCALES, type TranslationLocale } from "./incremental";
import en from "./locales/en.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import manifest from "./manifest.json";
import { summarizeUntranslated, type UntranslatedSummary } from "./untranslated";

/** Textes d'interface déjà enregistrés dans `ui_translations`, par langue. */
export async function loadStoredUiTexts(
  serviceDb: ReturnType<typeof getServiceDb> = getServiceDb(),
): Promise<Record<TranslationLocale, ReadonlySet<string>>> {
  const storedEntries = await Promise.all(
    TRANSLATION_LOCALES.map(async (locale) => {
      const rows = await serviceDb
        .select({ s: uiTranslations.sourceText })
        .from(uiTranslations)
        .where(eq(uiTranslations.locale, locale));
      return [locale, new Set(rows.map((row) => row.s))] as const;
    }),
  );
  return Object.fromEntries(storedEntries) as unknown as Record<TranslationLocale, ReadonlySet<string>>;
}

export async function getUntranslatedSummary(): Promise<UntranslatedSummary> {
  return summarizeUntranslated({ manifest, json: { en, es, pt }, stored: await loadStoredUiTexts() });
}
