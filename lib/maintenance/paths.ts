/**
 * Chemins jamais bloqués par le mode maintenance (pur, sans accès base : importé par proxy.ts).
 *
 * Règle de sécurité : on ne doit JAMAIS pouvoir s'enfermer dehors — l'administration, la connexion et l'API
 * d'authentification restent donc toujours joignables — ni perdre un paiement ou une tâche planifiée : les
 * webhooks et le cron restent actifs. Tout le reste (pages clientes, API clientes, démo, liens invités) est bloqué.
 */

const EXEMPT_PREFIXES = [
  "/admin",
  "/api/admin",
  "/api/auth",
  "/api/webhooks",
  "/api/cron",
  "/api/i18n/overlay",
] as const;

const EXEMPT_EXACT = new Set([
  "/login",
  "/two-factor",
  "/forgot-password",
  "/reset-password",
  "/maintenance",
  "/api/health",
  "/api/readyz",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/opengraph-image",
  "/twitter-image",
  "/apple-icon",
]);

function stripTrailingSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/** Vrai si la requête doit passer même en maintenance (comparaison par segment : `/adminx` n'est pas `/admin`). */
export function isMaintenanceExempt(pathname: string): boolean {
  const path = stripTrailingSlash(pathname);
  if (EXEMPT_EXACT.has(path)) return true;
  return EXEMPT_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}
