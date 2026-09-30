import { LANDING_LANGUAGE_COOKIE } from "./landing-language-cookie";

const LANGUAGE_CODE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;

/**
 * Mémorise la langue choisie dans le cookie lu côté serveur (lib/languages/preference.ts).
 * Écriture synchrone dans le navigateur : plus d'aller-retour serveur avant de pouvoir rafraîchir
 * l'affichage. Utilisé par le sélecteur de la landing et par le tableau de bord client.
 */
export function persistLanguageCookie(code: string): void {
  if (typeof document === "undefined" || !LANGUAGE_CODE.test(code)) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LANDING_LANGUAGE_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
}
