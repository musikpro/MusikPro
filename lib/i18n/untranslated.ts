import { TRANSLATION_LOCALES, missingUiTexts, type TranslationLocale } from "./incremental";

export type UntranslatedSummary = { perLocale: Record<TranslationLocale, number>; total: number };

export function summarizeUntranslated(input: {
  manifest: readonly string[];
  json: Record<TranslationLocale, Record<string, string>>;
  stored: Record<TranslationLocale, ReadonlySet<string>>;
}): UntranslatedSummary {
  const perLocale = Object.fromEntries(
    TRANSLATION_LOCALES.map((locale) => [
      locale,
      missingUiTexts(input.manifest, input.json[locale], input.stored[locale]).length,
    ]),
  ) as Record<TranslationLocale, number>;
  return { perLocale, total: TRANSLATION_LOCALES.reduce((sum, locale) => sum + perLocale[locale], 0) };
}
