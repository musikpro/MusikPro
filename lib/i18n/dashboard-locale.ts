import { headers } from "next/headers";
import { resolveLocaleFromAcceptLanguage } from "./request-locale";
import { LOCALE_HEADER } from "@/lib/languages/locale-path";
import type { Locale } from "./translate";

const LOCALES: readonly Locale[] = ["fr", "en", "es", "pt"];

/**
 * Pure part: a supported URL language wins; a URL language that is present but unsupported (admin-added
 * language, which the client shell also renders in French) gives "fr"; no URL language → Accept-Language.
 */
export function pickDashboardLocale(urlCode: string | null | undefined, acceptLanguage: string | null): Locale {
  if (urlCode) return LOCALES.find((locale) => locale === urlCode) ?? "fr";
  return resolveLocaleFromAcceptLanguage(acceptLanguage);
}

/**
 * Locale of server-rendered /dashboard texts: the URL prefix set by proxy.ts (same source as the
 * client shell, see app/dashboard/layout.tsx), falling back to Accept-Language.
 */
export async function resolveDashboardLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  return pickDashboardLocale(requestHeaders.get(LOCALE_HEADER), requestHeaders.get("accept-language"));
}
