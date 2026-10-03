/**
 * Marque une chaîne française comme clé de traduction SANS la traduire : le scanner (scripts/i18n-sync.mts)
 * l'ajoute au manifeste ; la traduction se fait à l'affichage (translate/translateIssue/translateApiMessage).
 * Sert aux textes qui vivent hors des composants (messages Zod, messages d'API, codes d'erreur).
 */
export function i18nKey(text: string): string {
  return text;
}
