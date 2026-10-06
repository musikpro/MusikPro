/**
 * Quand l'utilisateur quitte volontairement le parcours de création (boutons « Retour » et « Tableau de bord »), il ne
 * doit pas retomber sur l'écran « Tu avais déjà commencé une chanson » en revenant à l'étape 1. Ce témoin, posé côté
 * navigateur et lu par `app/dashboard/create/page.tsx`, saute l'écran de reprise une seule fois. Il ne contient aucune
 * donnée : seule la valeur « 1 » est reconnue, et le brouillon enregistré en base n'est jamais touché.
 */
export const RESUME_SKIP_COOKIE = "musikpro_resume_skip";
const MAX_AGE_SECONDS = 60 * 60;

export function markResumeSkip() {
  if (typeof document === "undefined") return;
  document.cookie = `${RESUME_SKIP_COOKIE}=1; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

export function clearResumeSkip() {
  if (typeof document === "undefined") return;
  document.cookie = `${RESUME_SKIP_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}
