import type { Locale } from "./translate";

const SUPPORTED_LOCALES = ["fr", "en", "es", "pt"] as const;

/**
 * Resolves the visitor's locale for a page with no authenticated session (and thus no saved
 * interface-language preference) from the standard Accept-Language request header — the
 * lightweight, request-scoped counterpart to lib/languages/detection.ts's DB/IP-backed
 * detectInterfaceLanguage, appropriate for a page like /s/[slug] that must stay fast and
 * dependency-free for anonymous, potentially high-volume traffic.
 */
export function resolveLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale {
  const primary = acceptLanguage?.split(",")[0]?.split("-")[0]?.trim().toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(primary ?? "") ? (primary as Locale) : "fr";
}
