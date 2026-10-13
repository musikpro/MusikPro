/**
 * Barre de menu du bas (téléphone) : retirée uniquement pour un visiteur arrivé par un lien invité, et seulement sur le
 * parcours d'achat de crédits (choix de l'offre, coordonnées, paiement) pour ne pas le disperser. Partout ailleurs dans
 * le tableau de bord, la barre reste affichée, que le visiteur soit venu d'un lien invité ou non.
 *
 * Module isomorphe, sans dépendance. `pathname` est le chemin interne sans préfixe de langue (ex. `/dashboard/credits`).
 */
const CREDIT_PURCHASE_PREFIXES = ["/dashboard/credits", "/dashboard/payment-preview"] as const;

export function shouldHideBottomNav({ guestOrigin, pathname }: { guestOrigin: boolean; pathname: string }): boolean {
  if (!guestOrigin) return false;
  return CREDIT_PURCHASE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
