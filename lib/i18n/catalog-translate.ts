import { translateBatch, type TranslationLocale } from "./ai-translate";
import type { CatalogTranslations } from "./translate";

export const CATALOG_LOCALES: TranslationLocale[] = ["en", "es", "pt"];
const BATCH_SIZE = 40;

/**
 * Translates a whole catalog table's rows in one pass: collects every distinct French field
 * value across all rows, translates each distinct string once per locale (so e.g. two occasions
 * that happen to share a description only cost one AI lookup), then maps the results back per row.
 * Always re-translates from scratch — catalog tables are small, so this is cheap, and it avoids
 * having to detect whether a French source field changed since the last translation.
 */
export async function translateCatalogTable<T extends Record<string, string | null | undefined>>(
  rows: Array<{ id: string; fields: T }>,
): Promise<Map<string, CatalogTranslations>> {
  const allStrings = new Set<string>();
  for (const row of rows) {
    for (const value of Object.values(row.fields)) {
      if (value?.trim()) allStrings.add(value.trim());
    }
  }
  const strings = [...allStrings];

  const perLocale: Partial<Record<TranslationLocale, Record<string, string>>> = {};
  for (const locale of CATALOG_LOCALES) {
    const translated: Record<string, string> = {};
    for (let i = 0; i < strings.length; i += BATCH_SIZE) {
      const batch = strings.slice(i, i + BATCH_SIZE);
      Object.assign(translated, await translateBatch(locale, batch));
    }
    perLocale[locale] = translated;
  }

  const result = new Map<string, CatalogTranslations>();
  for (const row of rows) {
    const translations: CatalogTranslations = {};
    for (const locale of CATALOG_LOCALES) {
      const fieldTranslations: Record<string, string> = {};
      for (const [key, value] of Object.entries(row.fields)) {
        const trimmed = value?.trim();
        if (!trimmed) continue;
        const translated = perLocale[locale]?.[trimmed];
        if (translated) fieldTranslations[key] = translated;
      }
      if (Object.keys(fieldTranslations).length) translations[locale] = fieldTranslations;
    }
    result.set(row.id, translations);
  }
  return result;
}
