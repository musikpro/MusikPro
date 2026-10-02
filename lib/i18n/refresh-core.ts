import {
  TRANSLATION_LOCALES,
  applyCatalogTranslations,
  catalogStringsNeeded,
  missingUiTexts,
  type CatalogRowInput,
  type TranslationLocale,
} from "./incremental";
import type { CatalogTranslations } from "./translate";

export type CatalogSource = {
  key: string;
  rows: CatalogRowInput[];
  save: (id: string, translations: CatalogTranslations) => Promise<void>;
};

export type RefreshDeps = {
  manifest: readonly string[];
  json: Record<TranslationLocale, Record<string, string>>;
  stored: Record<TranslationLocale, ReadonlySet<string>>;
  sources: CatalogSource[];
  translateBatch: (locale: TranslationLocale, strings: string[]) => Promise<Record<string, string>>;
  saveUi: (locale: TranslationLocale, entries: Record<string, string>) => Promise<void>;
  maxBatches: number;
  batchSize: number;
};

export type RefreshResult = {
  translated: number;
  alreadyUpToDate: number;
  remaining: number;
  ui: { translated: number; alreadyUpToDate: number };
  catalog: { translated: number; alreadyUpToDate: number };
  error: unknown | null;
};

/**
 * Une passe de l'actualisation : calcule ce qui manque (textes fixes + catalogue, par langue),
 * traduit au plus `maxBatches` lots, écrit tout ce qui a été obtenu — même si l'IA échoue en cours
 * de route — et dit combien il reste. Aucune dépendance base/IA : tout est injecté (testable).
 */
export async function runRefresh(deps: RefreshDeps): Promise<RefreshResult> {
  const jobs = TRANSLATION_LOCALES.map((locale) => {
    const uiMissing = missingUiTexts(deps.manifest, deps.json[locale], deps.stored[locale]);
    const catalogNeeded = new Set<string>();
    let catalogUpToDate = 0;
    for (const source of deps.sources) {
      for (const row of source.rows) {
        const { needed, upToDate } = catalogStringsNeeded(row, locale);
        for (const text of needed) catalogNeeded.add(text);
        catalogUpToDate += upToDate;
      }
    }
    return {
      locale,
      uiMissing: new Set(uiMissing),
      pool: [...new Set([...uiMissing, ...catalogNeeded])],
      uiUpToDate: deps.manifest.length - uiMissing.length,
      catalogUpToDate,
    };
  });

  // Dictionnaires sans prototype : « constructor » ou « __proto__ » ne doivent jamais passer pour une traduction.
  const translated: Record<TranslationLocale, Record<string, string>> = {
    en: Object.create(null),
    es: Object.create(null),
    pt: Object.create(null),
  };
  const has = (locale: TranslationLocale, text: string) => Object.hasOwn(translated[locale], text) && Boolean(translated[locale][text]);
  let budget = deps.maxBatches;
  let error: unknown = null;
  try {
    outer: for (const job of jobs) {
      for (let i = 0; i < job.pool.length; i += deps.batchSize) {
        if (budget <= 0) break outer;
        budget -= 1;
        Object.assign(translated[job.locale], await deps.translateBatch(job.locale, job.pool.slice(i, i + deps.batchSize)));
      }
    }
  } catch (caught) {
    error = caught;
  }

  let uiTranslated = 0;
  for (const job of jobs) {
    const entries = Object.fromEntries(
      job.pool.filter((text) => job.uiMissing.has(text) && has(job.locale, text)).map((text) => [text, translated[job.locale][text]]),
    );
    const count = Object.keys(entries).length;
    if (count) {
      await deps.saveUi(job.locale, entries);
      uiTranslated += count;
    }
  }

  let catalogTranslated = 0;
  for (const source of deps.sources) {
    await Promise.all(
      source.rows.map(async (row) => {
        let current = row.translations ?? null;
        let rowChanged = false;
        for (const locale of TRANSLATION_LOCALES) {
          const result = applyCatalogTranslations({ ...row, translations: current }, locale, translated[locale]);
          if (result.changed) {
            current = result.translations;
            rowChanged = true;
            catalogTranslated += result.translatedFields;
          }
        }
        if (rowChanged && current) await source.save(row.id, current);
      }),
    );
  }

  const remaining = jobs.reduce((sum, job) => sum + job.pool.filter((text) => !has(job.locale, text)).length, 0);
  const uiUpToDate = jobs.reduce((sum, job) => sum + job.uiUpToDate, 0);
  const catalogUpToDate = jobs.reduce((sum, job) => sum + job.catalogUpToDate, 0);
  return {
    translated: uiTranslated + catalogTranslated,
    alreadyUpToDate: uiUpToDate + catalogUpToDate,
    remaining,
    ui: { translated: uiTranslated, alreadyUpToDate: uiUpToDate },
    catalog: { translated: catalogTranslated, alreadyUpToDate: catalogUpToDate },
    error,
  };
}
