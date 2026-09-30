/**
 * URLs préfixées par la langue : `/fr`, `/en/dashboard/songs`, `/pt/demo`…
 *
 * Même schéma que le préfixe `/demo` (proxy.ts) : le navigateur voit l'URL préfixée, le proxy la
 * réécrit vers la vraie route (`/`, `/dashboard/*`, `/demo/*`) et transmet la langue dans l'en-tête
 * `x-musikpro-locale`. Le proxy ne connaît pas le catalogue (base de données) : il accepte tout
 * segment de 2 à 3 lettres, puis le serveur valide le code contre les langues actives de l'admin
 * (404 si inconnu). Ajouter une langue dans /admin/languages suffit donc, sans configuration.
 *
 * Module isomorphe (proxy, serveur et client) : aucune dépendance.
 */
export const LOCALE_HEADER = "x-musikpro-locale";
export const REQUEST_PATH_HEADER = "x-musikpro-path";

// Segments de 2-3 lettres qui sont déjà des routes de premier niveau et ne doivent jamais être pris
// pour une langue.
const RESERVED_SEGMENTS = new Set(["api", "s"]);
// Seules la landing, le tableau de bord client et sa démo portent un préfixe de langue.
const LOCALIZED_REST = /^(\/|\/dashboard(\/.*)?|\/demo(\/.*)?)$/;
const LOCALE_SEGMENT = /^\/([a-z]{2,3})(\/.*)?$/;

export function splitLocalePrefix(pathname: string): { locale: string | null; path: string } {
  const match = LOCALE_SEGMENT.exec(pathname);
  if (!match) return { locale: null, path: pathname };
  const [, code, rest = ""] = match;
  const path = rest || "/";
  if (RESERVED_SEGMENTS.has(code) || !LOCALIZED_REST.test(path)) return { locale: null, path: pathname };
  return { locale: code, path };
}

/** `/dashboard/songs` + `en` → `/en/dashboard/songs` ; `/` + `en` → `/en`. Remplace un préfixe existant. */
export function withLocalePrefix(pathname: string, locale: string): string {
  const { path } = splitLocalePrefix(pathname);
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** Retire le préfixe de langue (`/en/dashboard` → `/dashboard`) — sert aux comparaisons de routes actives. */
export function stripLocalePrefix(pathname: string): string {
  return splitLocalePrefix(pathname).path;
}
