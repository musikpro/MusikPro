/**
 * Suivi marketing d'une entrée par lien invité : uniquement les paramètres utm, la simple présence d'un identifiant
 * de clic publicitaire (jamais sa valeur) et le domaine du référent (jamais le chemin ni la requête). Toute valeur est
 * bornée et nettoyée : rien d'inattendu n'est écrit dans l'entonnoir.
 */
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const CLICK_ID_KEYS = ["fbclid", "ttclid", "gclid", "msclkid"] as const;
const MAX_VALUE_LENGTH = 80;
const SAFE_VALUE = /^[\p{L}\p{N} ._~+\-:]+$/u;

export type GuestTracking = Partial<Record<(typeof UTM_KEYS)[number], string>> & {
  click_id?: true;
  referrer_host?: string;
};

export function extractGuestTracking(searchParams: URLSearchParams, referer: string | null): GuestTracking {
  const tracking: GuestTracking = {};
  for (const key of UTM_KEYS) {
    const value = searchParams.get(key)?.trim();
    if (value && value.length <= MAX_VALUE_LENGTH && SAFE_VALUE.test(value)) tracking[key] = value;
  }
  if (CLICK_ID_KEYS.some((key) => searchParams.has(key))) tracking.click_id = true;
  if (referer) {
    try {
      const url = new URL(referer);
      if ((url.protocol === "https:" || url.protocol === "http:") && url.hostname.length <= 100) {
        tracking.referrer_host = url.hostname;
      }
    } catch {
      // Référent illisible : ignoré.
    }
  }
  return tracking;
}
