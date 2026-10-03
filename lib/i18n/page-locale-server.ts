import "server-only";
import { cookies, headers } from "next/headers";
import { LANDING_LANGUAGE_COOKIE } from "@/lib/languages/landing-language-cookie";
import { LOCALE_HEADER, REQUEST_PATH_HEADER } from "@/lib/languages/locale-path";
import { pickPageLocale } from "./page-locale";
import type { Locale } from "./translate";

/** Langue de la page en cours, lue depuis la requête (même règle partout : layout racine, métadonnées, e-mails…). */
export async function resolvePageLocale(): Promise<Locale> {
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  return pickPageLocale({
    pathname: requestHeaders.get(REQUEST_PATH_HEADER),
    urlCode: requestHeaders.get(LOCALE_HEADER),
    cookie: cookieStore.get(LANDING_LANGUAGE_COOKIE)?.value,
    acceptLanguage: requestHeaders.get("accept-language"),
  });
}
