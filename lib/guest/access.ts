/**
 * Accès « invité » (mode invité des publicités) : un visiteur sans compte, arrivé par un lien `/g/<slug>`, peut ouvrir
 * l'accueil et les écrans de création jusqu'au choix de la langue et de la voix. Tout le reste du tableau de bord
 * exige un compte.
 *
 * Module isomorphe (proxy, serveur et client) : aucune dépendance. Le proxy pose l'en-tête interne `GUEST_HEADER`
 * (jamais lu depuis le client : il est supprimé des requêtes entrantes) ; `lib/auth/session.ts` le relit puis revérifie
 * le chemin avec `isGuestAllowedPath`, par prudence.
 */
export const GUEST_COOKIE = "musikpro_guest";
export const GUEST_HEADER = "x-musikpro-guest-route";
export const GUEST_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const GUEST_USER_ID = "musikpro-guest-visitor";

// Chemins internes (sans préfixe de langue). Liste fermée et exacte : aucune sous-route, aucun joker.
const GUEST_ALLOWED_PATHS: ReadonlySet<string> = new Set([
  "/dashboard",
  "/dashboard/create",
  "/dashboard/create/story",
  "/dashboard/create/recipient",
  "/dashboard/create/style",
  "/dashboard/create/genre",
  "/dashboard/create/parameters",
]);

/** `path` est une route interne sans préfixe de langue (ex. `/dashboard/create/story`). La barre finale est tolérée. */
export function isGuestAllowedPath(path: string): boolean {
  if (!path) return false;
  const normalized = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return GUEST_ALLOWED_PATHS.has(normalized);
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const COOKIE_PATTERN = new RegExp(`^(${UUID})\\.(${UUID})$`);

/** Valeur du cookie : identifiant du lien d'entrée + identifiant aléatoire du visiteur. Aucune donnée personnelle. */
export function buildGuestCookieValue(linkId: string, visitorId: string): string {
  return `${linkId}.${visitorId}`;
}

export function parseGuestCookie(value: string | null | undefined): { linkId: string; visitorId: string } | null {
  if (!value) return null;
  const match = COOKIE_PATTERN.exec(value);
  return match ? { linkId: match[1], visitorId: match[2] } : null;
}

/** Chemin d'arrivée d'un lien invité selon sa destination (le formulaire par défaut). */
export function guestEntryPath(destination: string): string {
  return destination === "dashboard" ? "/dashboard" : "/dashboard/create";
}
