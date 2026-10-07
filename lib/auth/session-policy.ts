/**
 * Durée des sessions : 24 h au maximum pour un propriétaire (administrateur, financier, support, rôles
 * personnalisés), à partir de la connexion — l'activité ne la prolonge jamais. Un client reste connecté tant qu'il ne
 * se déconnecte pas : la durée serveur est très longue et se renouvelle à chaque jour d'usage.
 */
export const OWNER_SESSION_SECONDS = 60 * 60 * 24;
export const CLIENT_SESSION_SECONDS = 60 * 60 * 24 * 365 * 10;
export const SESSION_REFRESH_SECONDS = 60 * 60 * 24;

export function ownerSessionExpiry(startedAt: Date): Date {
  return new Date(startedAt.getTime() + OWNER_SESSION_SECONDS * 1000);
}

/** Échéance d'une session de propriétaire : jamais plus de 24 h après sa création, même si elle est renouvelée. */
export function clampOwnerExpiry(session: { createdAt: Date; expiresAt: Date }): Date {
  const limit = ownerSessionExpiry(session.createdAt).getTime();
  return new Date(Math.min(session.expiresAt.getTime(), limit));
}
