import "server-only";

import { cookies, headers } from "next/headers";
import type { LanguageOption } from "./catalog";
import { detectInterfaceLanguage } from "./detection";
import { LANDING_LANGUAGE_COOKIE } from "./landing-language-cookie";
import { LOCALE_HEADER, REQUEST_PATH_HEADER } from "./locale-path";

/**
 * Système commun de préférence de langue — landing publique ET tableau de bord client.
 *
 * Une seule source de vérité : le cookie `musikpro_lang` (code langue), écrit côté navigateur par
 * `persistLanguageCookie` (lib/languages/preference-client.ts) au moment du choix. Le serveur le lit
 * ici pour rendre directement la bonne langue, sans passer par la détection géo-IP (appel réseau +
 * requêtes base) qui ne sert que de repli tant que le visiteur n'a rien choisi.
 */
export async function readLanguagePreference(): Promise<string | undefined> {
  return (await cookies()).get(LANDING_LANGUAGE_COOKIE)?.value;
}

/**
 * Langue d'interface à afficher : le choix explicite (cookie) s'il correspond à une langue active,
 * sinon la détection géo-IP existante. Un code inconnu/désactivé est simplement ignoré.
 */
export async function resolveInterfaceLanguage(
  requestHeaders: Headers,
  languages: LanguageOption[],
  preferredCode: string | undefined,
): Promise<LanguageOption | null> {
  const preferred = languages.find((language) => language.code === preferredCode);
  return preferred ?? (await detectInterfaceLanguage(requestHeaders, languages));
}

/**
 * Code de langue présent dans l'URL (`/en/dashboard` → "en"), posé par proxy.ts. `null` si l'URL
 * n'est pas préfixée. À valider avec `resolveUrlLanguage` : le proxy ne connaît pas le catalogue.
 */
export async function readRequestLocale(): Promise<string | null> {
  return (await headers()).get(LOCALE_HEADER);
}

/** Chemin + query d'origine tels que vus par le navigateur (préfixe de langue inclus). */
export async function readRequestPath(): Promise<string> {
  return (await headers()).get(REQUEST_PATH_HEADER) ?? "/";
}

/**
 * Langue choisie par l'URL, si elle correspond à une langue active du catalogue admin.
 * Retourne `undefined` quand l'URL n'a pas de préfixe ; `null` quand le préfixe est inconnu/désactivé
 * (l'appelant répond alors 404).
 */
export function resolveUrlLanguage(
  urlCode: string | null,
  languages: LanguageOption[],
): LanguageOption | null | undefined {
  if (!urlCode) return undefined;
  return languages.find((language) => language.code === urlCode) ?? null;
}
