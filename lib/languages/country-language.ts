import type { LanguageOption } from "./catalog";

const FRENCH_COUNTRIES = new Set([
  "BE",
  "BF",
  "BI",
  "BJ",
  "CA",
  "CD",
  "CF",
  "CG",
  "CH",
  "CI",
  "CM",
  "DJ",
  "DZ",
  "FR",
  "GA",
  "GN",
  "GQ",
  "HT",
  "KM",
  "LU",
  "MA",
  "MC",
  "MG",
  "ML",
  "MR",
  "MU",
  "NE",
  "RW",
  "SC",
  "SN",
  "TD",
  "TG",
  "TN",
  "VU",
]);
const SPANISH_COUNTRIES = new Set([
  "AR",
  "BO",
  "CL",
  "CO",
  "CR",
  "CU",
  "DO",
  "EC",
  "ES",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PR",
  "PY",
  "SV",
  "UY",
  "VE",
]);

const PORTUGUESE_COUNTRIES = new Set(["AO", "BR", "CV", "GW", "MZ", "PT", "ST", "TL"]);

export function languageCodeForCountry(countryCode: string): "fr" | "en" | "es" | "pt" {
  const country = countryCode.trim().toUpperCase();
  if (FRENCH_COUNTRIES.has(country)) return "fr";
  if (SPANISH_COUNTRIES.has(country)) return "es";
  if (PORTUGUESE_COUNTRIES.has(country)) return "pt";
  return "en";
}

/**
 * Resolves the interface language for a country, preferring an admin-configured
 * override (from the `country_languages` table) over the static heuristic mapping.
 */
export function resolveCountryLanguage(countryCode: string, overrides: Record<string, string>): string {
  const country = countryCode.trim().toUpperCase();
  const override = overrides[country];
  if (override) return override;
  return languageCodeForCountry(country);
}

/**
 * Resolves the interface language option for a detected (or configured fallback) country,
 * falling back to `fallback` when no country is known, or when the resolved language isn't
 * among the currently active interface languages.
 */
export function resolveLanguageForCountry(
  country: string | null,
  overrides: Record<string, string>,
  activeLanguages: LanguageOption[],
  fallback: LanguageOption,
): LanguageOption {
  if (!country) return fallback;
  const languageCode = resolveCountryLanguage(country, overrides);
  return activeLanguages.find((language) => language.code === languageCode) ?? fallback;
}
