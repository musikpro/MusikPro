import { splitLocalePrefix, withLocalePrefix } from "@/lib/languages/locale-path";

/** Route interne de l'app : retire le préfixe de langue (`/en/demo/x`) puis le préfixe démo (`/demo/x` → `/dashboard/x`). */
export function normalizeDashboardPath(pathname: string) {
  const path = splitLocalePrefix(pathname).path;
  return path.startsWith("/demo") ? path.replace(/^\/demo/, "/dashboard") || "/dashboard" : path;
}

/**
 * Lien vers une page du tableau de bord : préfixe démo si besoin, puis préfixe de langue (`/en/…`)
 * quand la langue courante est connue, pour que la navigation garde l'URL localisée.
 */
export function dashboardHref(route: string, isDemo: boolean, locale?: string | null) {
  const mapped = isDemo && route.startsWith("/dashboard") ? route.replace(/^\/dashboard/, "/demo") || "/demo" : route;
  return locale && (mapped.startsWith("/dashboard") || mapped.startsWith("/demo"))
    ? withLocalePrefix(mapped, locale)
    : mapped;
}
