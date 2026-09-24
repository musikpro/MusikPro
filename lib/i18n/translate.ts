import en from "./locales/en.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";

type Locale = "fr" | "en" | "es" | "pt";

/**
 * Shape stored in an admin-managed catalog row's `translations` jsonb column (occasions, music
 * styles, recipient relations, credit plans) — kept here, not in lib/i18n/catalog-translate.ts,
 * so pure client-side types (e.g. lib/occasions/catalog.ts's OccasionOption) can reference it
 * without pulling in that module's server-only AI/DB dependencies into a client bundle.
 */
export type CatalogTranslations = Partial<Record<Exclude<Locale, "fr">, Record<string, string>>>;

/**
 * French is the source language (keys double as the fallback string, never translated here).
 * The en/es/pt dictionaries are generated files: run `npm run i18n:sync` after adding new
 * t("...") calls to fill in missing keys via the connected AI provider (see scripts/i18n-sync.mts).
 */
const dictionaries: Record<Exclude<Locale, "fr">, Record<string, string>> = { en, es, pt };

export function translate(text: string): string {
  if (typeof document === "undefined") return text;
  const locale = document.documentElement.lang.split("-")[0] as Locale;
  return locale === "fr" ? text : (dictionaries[locale]?.[text] ?? text);
}

/**
 * For strings with a dynamic value (a count, a name…): pass a literal template with {param}
 * placeholders — never build the t() key from a template literal with `${}` interpolation, since
 * the interpolated value would end up part of the dictionary lookup key instead of a stable,
 * scriptable translation key (scripts/i18n-sync.mts only extracts literal t("...") strings).
 * Example: translateTemplate("Maximum {count} mots", { count: MAX_WORDS })
 */
export function translateTemplate(text: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    translate(text),
  );
}

/**
 * For a single named field of an admin-managed catalog row (occasion/music style/recipient
 * relation/credit plan name, description, bonus…) whose French value is also the app's canonical
 * stored/matching value (see lib/banani/DemoProvider.tsx `choose()`): never translate that stored
 * value itself, only its DISPLAY via this helper, reading the row's own `translations` jsonb
 * column (shape `{ en: { [field]: "..." }, es: {...}, pt: {...} }`) — populated by the "Actualiser
 * les traductions" admin action (app/admin/languages/actions.ts), not the static t() dictionary.
 */
export function localizeField(
  base: string,
  translations: CatalogTranslations | null | undefined,
  field: string,
): string {
  if (typeof document === "undefined") return base;
  const locale = document.documentElement.lang.split("-")[0] as Locale;
  if (locale === "fr") return base;
  return translations?.[locale]?.[field] || base;
}
