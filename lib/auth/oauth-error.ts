import { translate as t } from "@/lib/i18n/translate";

export function getOAuthErrorMessage(code?: string) {
  if (!code) return "";
  switch (code) {
    case "state_mismatch":
      return t("Cette tentative de connexion Google a expiré ou a déjà été utilisée. Recommencez la connexion.");
    case "state_not_found":
      return t("La connexion Google n’a pas pu être vérifiée. Recommencez la connexion.");
    case "state_invalid":
      return t("La connexion Google n’est plus valide. Recommencez la connexion.");
    case "invalid_code":
      return t("Google n’a pas pu valider cette connexion. Recommencez dans quelques instants.");
    case "native_unavailable":
      return t(
        "La connexion Google n’est pas disponible dans l’application pour le moment. Réessayez dans un instant ou connectez-vous avec votre adresse e-mail.",
      );
    case "oauth_provider_not_found":
      return t("La connexion Google est momentanément indisponible.");
    default:
      return t("La connexion n’a pas abouti. Veuillez réessayer.");
  }
}
