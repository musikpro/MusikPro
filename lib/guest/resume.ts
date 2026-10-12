/**
 * Reprise du parcours après la connexion d'un visiteur invité. Un cookie court, posé au clic sur « Se connecter pour
 * continuer », indique à `/auth/continue` de ramener un client (jamais un administrateur) vers la création de chanson,
 * et au tableau de bord de verser le brouillon gardé dans le navigateur vers le brouillon du compte. Aucun paramètre
 * d'URL `next` : la destination est fixe, donc aucune redirection ouverte possible.
 */
export const GUEST_RESUME_COOKIE = "musikpro_guest_resume";
export const GUEST_RESUME_MAX_AGE_SECONDS = 60 * 60;
export const GUEST_RESUME_PATH = "/dashboard/create";

/** Navigateurs intégrés des réseaux sociaux : Google refuse d'y ouvrir sa page de connexion (disallowed_useragent). */
const IN_APP_BROWSER =
  /FBAN|FBAV|FB_IAB|Instagram|musical_ly|BytedanceWebview|TikTok|Snapchat|Line\/|Twitter|LinkedInApp/i;

export function isSocialInAppBrowser(userAgent: string): boolean {
  return IN_APP_BROWSER.test(userAgent);
}
