import { resolveLocaleFromAcceptLanguage } from "./request-locale";
import type { Locale } from "./translate";

const LOCALES: readonly Locale[] = ["fr", "en", "es", "pt"];

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return typeof value === "string" && LOCALES.some((locale) => locale === value);
}

/** Valeur d'un cookie dans un en-tête `Cookie` brut (utile hors Server Component, ex. callback e-mail). */
export function readCookieValue(cookieHeader: string | null | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return undefined;
}

/**
 * Langue d'une page : préfixe d'URL (supporté, sinon fr) > cookie `musikpro_lang` > Accept-Language > fr.
 * `/admin` est toujours en français (l'admin est hors du périmètre de traduction).
 * La détection par IP n'est PAS appelée ici (appel réseau à chaque page) : elle reste sur la landing.
 */
export function pickPageLocale(input: {
  pathname?: string | null;
  urlCode?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (input.pathname && /^\/admin(?:[/?#]|$)/.test(input.pathname)) return "fr";
  if (input.urlCode) return isSupportedLocale(input.urlCode) ? input.urlCode : "fr";
  if (isSupportedLocale(input.cookie)) return input.cookie;
  return resolveLocaleFromAcceptLanguage(input.acceptLanguage ?? null);
}
