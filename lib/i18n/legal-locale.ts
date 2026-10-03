import type { Locale } from "./translate";

/** Date de dernière mise à jour des pages légales (constante canonique, jamais traduite). */
const LEGAL_UPDATED_AT = Date.UTC(2026, 8, 19);

/**
 * Langue d'une page légale : `?lang=fr` force la version française (celle qui fait foi) ;
 * toute autre valeur (casse différente, inconnue, tableau, absence) est ignorée.
 */
export function isFrenchForced(langParam: string | string[] | undefined): boolean {
  return langParam === "fr";
}

export function pickLegalLocale(pageLocale: Locale, langParam: string | string[] | undefined): Locale {
  return isFrenchForced(langParam) ? "fr" : pageLocale;
}

/** « 19 septembre 2026 » en français ; formaté pour la langue demandée sinon (UTC : pas de décalage de jour). */
export function formatLegalDate(locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    LEGAL_UPDATED_AT,
  );
}

/** Découpe un modèle traduit autour du premier `{email}` ; `null` si une traduction a perdu le marqueur. */
export function splitEmailTemplate(text: string): [string, string] | null {
  const index = text.indexOf("{email}");
  if (index === -1) return null;
  return [text.slice(0, index), text.slice(index + "{email}".length)];
}
