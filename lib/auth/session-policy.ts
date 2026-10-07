/**
 * Durée des sessions : 24 h au maximum pour un propriétaire (administrateur, financier, support, rôles
 * personnalisés), à partir de la connexion — l'activité ne la prolonge jamais. Un client reste connecté tant qu'il ne
 * se déconnecte pas : la durée est la plus longue qu'un cookie autorise (399 jours) et se renouvelle à chaque jour
 * d'usage, donc une personne qui revient au moins une fois par an n'est jamais déconnectée.
 */
export const OWNER_SESSION_SECONDS = 60 * 60 * 24;
/** Un cookie ne peut pas dépasser 400 jours (RFC 6265bis) : au-delà, la création du cookie échoue et plus personne ne se connecte. */
export const MAX_COOKIE_SECONDS = 60 * 60 * 24 * 400;
export const CLIENT_SESSION_SECONDS = 60 * 60 * 24 * 399;
export const SESSION_REFRESH_SECONDS = 60 * 60 * 24;

export function ownerSessionExpiry(startedAt: Date): Date {
  return new Date(startedAt.getTime() + OWNER_SESSION_SECONDS * 1000);
}

/** Échéance d'une session de propriétaire : jamais plus de 24 h après sa création, même si elle est renouvelée. */
export function clampOwnerExpiry(session: { createdAt: Date; expiresAt: Date }): Date {
  const limit = ownerSessionExpiry(session.createdAt).getTime();
  return new Date(Math.min(session.expiresAt.getTime(), limit));
}
