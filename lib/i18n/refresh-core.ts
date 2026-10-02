import {
  TRANSLATION_LOCALES,
  applyCatalogTranslations,
  catalogStringsNeeded,
  missingUiTexts,
  type CatalogRowInput,
  type TranslationLocale,
} from "./incremental";
import type { CatalogTranslations } from "./translate";

/**
 * Découpe en lots d'au plus `maxItems` textes ET `maxChars` caractères cumulés, ordre conservé.
 * Un texte plus long que `maxChars` forme son propre lot.
 */
export function chunkByBudget(strings: string[], maxItems: number, maxChars: number): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const text of strings) {
    if (current.length > 0 && (current.length >= maxItems || chars + text.length > maxChars)) {
      chunks.push(current);
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += text.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

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
  /** Budget de temps (ms) : plus aucun lot n'est lancé une fois dépassé ; l'écriture a toujours lieu. */
  maxMillis?: number;
  /** Horloge injectable (tests). */
  now?: () => number;
  /** Erreurs « réponse illisible » : le lot est scindé en deux et retenté. Par défaut aucune (tout abandonne). */
  isRetryableError?: (error: unknown) => boolean;
  /** Plafond de caractères cumulés par lot (les gros paragraphes font tronquer le JSON de l'IA). Défaut : illimité. */
  maxCharsPerBatch?: number;
};

export type RefreshResult = {
  translated: number;
  alreadyUpToDate: number;
  remaining: number;
  /** Textes du pool qui ont échoué même seuls (réponse IA illisible) : laissés non traduits, retentés au prochain passage. */
  skipped: number;
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
  const now = deps.now ?? Date.now;
  const startedAt = now();
  let error: unknown = null;
  let skipped = 0;
  const isRetryable = deps.isRetryableError ?? (() => false);
  const overTime = () => deps.maxMillis !== undefined && now() - startedAt >= deps.maxMillis;

  /**
   * Traduit un lot. Sur erreur « réponse illisible » (retryable) et plus d'un texte, scinde en deux moitiés
   * traduites récursivement ; un texte seul qui échoue est ignoré (reste non traduit, compté dans `skipped`).
   * Ces retentatives ne consomment PAS `maxBatches` : elles sont bornées par le budget de temps `maxMillis`
   * (horloge vérifiée avant chaque appel de retentative). Toute autre erreur remonte et interrompt la passe.
   */
  async function translateChunk(locale: TranslationLocale, chunk: string[]): Promise<void> {
    try {
      Object.assign(translated[locale], await deps.translateBatch(locale, chunk));
    } catch (caught) {
      if (!isRetryable(caught)) throw caught;
      if (chunk.length === 1) {
        skipped += 1;
        return;
      }
      const middle = Math.ceil(chunk.length / 2);
      for (const half of [chunk.slice(0, middle), chunk.slice(middle)]) {
        if (overTime()) return;
        await translateChunk(locale, half);
      }
    }
  }

  try {
    outer: for (const job of jobs) {
      for (const chunk of chunkByBudget(job.pool, deps.batchSize, deps.maxCharsPerBatch ?? Infinity)) {
        if (budget <= 0) break outer;
        if (overTime()) break outer;
        budget -= 1;
        await translateChunk(job.locale, chunk);
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
    skipped,
    ui: { translated: uiTranslated, alreadyUpToDate: uiUpToDate },
    catalog: { translated: catalogTranslated, alreadyUpToDate: catalogUpToDate },
    error,
  };
}
