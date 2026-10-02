import { createHash } from "node:crypto";
import type { CatalogTranslations } from "./translate";

export const TRANSLATION_LOCALES = ["en", "es", "pt"] as const;
export type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];

export type CatalogRowInput = {
  id: string;
  fields: Record<string, string | null | undefined>;
  translations: CatalogTranslations | null | undefined;
};

/** Empreinte courte du texte français : détecte qu'une source a changé depuis sa traduction. */
export function sourceHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 16);
}

/** Textes du manifeste absents du JSON ET de la table : ce que le bouton doit encore traduire. */
export function missingUiTexts(
  manifest: readonly string[],
  json: Record<string, string>,
  stored: ReadonlySet<string>,
): string[] {
  return manifest.filter((key) => !Object.hasOwn(json, key) && !stored.has(key));
}

function activeFields(fields: CatalogRowInput["fields"]): Array<[string, string]> {
  return Object.entries(fields).flatMap(([key, value]) => {
    const text = value?.trim();
    return text ? [[key, text] as [string, string]] : [];
  });
}

function isFresh(row: CatalogRowInput, locale: TranslationLocale, field: string, text: string): boolean {
  return Boolean(row.translations?.[locale]?.[field]) && row.translations?._src?.[locale]?.[field] === sourceHash(text);
}

/** Champs d'une ligne à (re)traduire pour une langue, et nombre de champs déjà à jour. */
export function catalogStringsNeeded(
  row: CatalogRowInput,
  locale: TranslationLocale,
): { needed: string[]; upToDate: number } {
  const needed: string[] = [];
  let upToDate = 0;
  for (const [field, text] of activeFields(row.fields)) {
    if (isFresh(row, locale, field, text)) upToDate += 1;
    else needed.push(text);
  }
  return { needed, upToDate };
}

function sameRecord(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

/**
 * Applique les traductions reçues à une ligne pour une langue.
 * - champ à jour (empreinte identique) : conservé ;
 * - traduction reçue : écrite avec son empreinte ;
 * - ligne héritée (aucune empreinte) sans traduction reçue : l'ancienne valeur reste affichée, sans empreinte ;
 * - source modifiée sans traduction reçue : l'ancienne valeur est retirée (retombe sur le français) ;
 * - champ vide ou disparu : sa traduction est retirée.
 */
export function applyCatalogTranslations(
  row: CatalogRowInput,
  locale: TranslationLocale,
  translated: Record<string, string>,
): { translations: CatalogTranslations | null; changed: boolean; translatedFields: number } {
  const previous = row.translations?.[locale] ?? {};
  const previousSrc = row.translations?._src?.[locale] ?? {};
  const values: Record<string, string> = {};
  const hashes: Record<string, string> = {};
  let translatedFields = 0;

  for (const [field, text] of activeFields(row.fields)) {
    const hash = sourceHash(text);
    const received = translated[text];
    if (isFresh(row, locale, field, text)) {
      values[field] = previous[field];
      hashes[field] = hash;
    } else if (received) {
      values[field] = received;
      hashes[field] = hash;
      translatedFields += 1;
    } else if (previous[field] && previousSrc[field] === undefined) {
      values[field] = previous[field];
    }
  }

  if (sameRecord(previous, values) && sameRecord(previousSrc, hashes)) {
    return { translations: row.translations ?? null, changed: false, translatedFields: 0 };
  }

  const next: CatalogTranslations = { ...(row.translations ?? {}) };
  if (Object.keys(values).length) next[locale] = values;
  else delete next[locale];
  const src = { ...(row.translations?._src ?? {}) };
  if (Object.keys(hashes).length) src[locale] = hashes;
  else delete src[locale];
  if (Object.keys(src).length) next._src = src;
  else delete next._src;
  return { translations: next, changed: true, translatedFields };
}
