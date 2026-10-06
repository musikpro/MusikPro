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
  // Quitter volontairement le parcours : le choix « Continuer » fait plus tôt ne doit pas survivre.
  clearResumeContinued();
}

export function clearResumeSkip() {
  if (typeof document === "undefined") return;
  document.cookie = `${RESUME_SKIP_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  // Une entrée normale dans la création (étape 1) repart de zéro côté mémoire du choix « Continuer ».
  clearResumeContinued();
}

/**
 * Retour du système (touche, geste ou barre Android, bouton du navigateur) : il ramène à l'écran « Tu avais déjà
 * commencé une chanson » par lequel l'utilisateur est passé en choisissant « Continuer ma chanson ». Cet écran a déjà
 * rempli son rôle : on retient le choix pour la session de l'onglet (sessionStorage, rien n'est envoyé au serveur) afin
 * de l'afficher en passant directement à l'étape 1. Valable 2 heures, une seule fois.
 */
const CONTINUED_KEY = "musikpro_resume_continued";
const CONTINUED_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export function markResumeContinued(now = Date.now()) {
  try {
    sessionStorage.setItem(CONTINUED_KEY, String(now));
  } catch {
    // stockage indisponible (navigation privée…) : on garde l'ancien comportement, sans erreur.
  }
}

export function clearResumeContinued() {
  try {
    sessionStorage.removeItem(CONTINUED_KEY);
  } catch {
    // voir markResumeContinued
  }
}

/** Vrai une seule fois si l'utilisateur a choisi « Continuer » récemment dans cet onglet ; efface alors le choix. */
export function consumeResumeContinued(now = Date.now()): boolean {
  try {
    const stored = Number(sessionStorage.getItem(CONTINUED_KEY));
    sessionStorage.removeItem(CONTINUED_KEY);
    return Number.isFinite(stored) && stored > 0 && now - stored >= 0 && now - stored <= CONTINUED_MAX_AGE_MS;
  } catch {
    return false;
  }
}
