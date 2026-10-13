/**
 * Barre de menu du bas (téléphone) : retirée sur le parcours d'achat de crédits (page « Crédits & tarifs », coordonnées,
 * paiement) pour tous les utilisateurs, afin que le bouton « Acheter des crédits » reste seul fixé en bas. Partout
 * ailleurs dans le tableau de bord, la barre reste affichée.
 *
 * Module isomorphe, sans dépendance. `pathname` est le chemin interne sans préfixe de langue (ex. `/dashboard/credits`).
 */
const CREDIT_PURCHASE_PREFIXES = ["/dashboard/credits", "/dashboard/payment-preview"] as const;

export function shouldHideBottomNav({ pathname }: { guestOrigin?: boolean; pathname: string }): boolean {
  return CREDIT_PURCHASE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
