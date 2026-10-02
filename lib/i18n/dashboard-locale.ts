import { headers } from "next/headers";
import { resolveLocaleFromAcceptLanguage } from "./request-locale";
import { LOCALE_HEADER } from "@/lib/languages/locale-path";
import type { Locale } from "./translate";

const LOCALES: readonly Locale[] = ["fr", "en", "es", "pt"];

/** Pure part: the URL language (when it is a supported locale) wins, else the browser's Accept-Language. */
export function pickDashboardLocale(urlCode: string | null | undefined, acceptLanguage: string | null): Locale {
  const fromUrl = LOCALES.find((locale) => locale === urlCode);
  return fromUrl ?? resolveLocaleFromAcceptLanguage(acceptLanguage);
}

/**
 * Locale of server-rendered /dashboard texts: the URL prefix set by proxy.ts (same source as the
 * client shell, see app/dashboard/layout.tsx), falling back to Accept-Language.
 */
export async function resolveDashboardLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  return pickDashboardLocale(requestHeaders.get(LOCALE_HEADER), requestHeaders.get("accept-language"));
}
