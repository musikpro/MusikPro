const oauthErrorMessages: Record<string, string> = {
  state_mismatch:
    "Cette tentative de connexion Google a expiré ou a déjà été utilisée. Recommencez la connexion.",
  state_not_found:
    "La connexion Google n’a pas pu être vérifiée. Recommencez la connexion.",
  state_invalid:
    "La connexion Google n’est plus valide. Recommencez la connexion.",
  invalid_code:
    "Google n’a pas pu valider cette connexion. Recommencez dans quelques instants.",
  oauth_provider_not_found:
    "La connexion Google est momentanément indisponible.",
};

export function getOAuthErrorMessage(code?: string) {
  if (!code) return "";
  return oauthErrorMessages[code] ?? "La connexion n’a pas abouti. Veuillez réessayer.";
}
