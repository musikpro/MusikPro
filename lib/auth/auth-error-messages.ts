import { translate as t } from "@/lib/i18n/translate";

/**
 * Message affichable pour un code d'erreur stable de better-auth (v1.7.x : BASE_ERROR_CODES,
 * plugins two-factor et captcha). `switch` volontaire : jamais d'objet indexé par une clé externe.
 * `t()` est appelé à l'exécution, jamais au chargement du module.
 */
export function authErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "INVALID_EMAIL":
      return t("Adresse e-mail invalide.");
    case "INVALID_PASSWORD":
      return t("Mot de passe incorrect.");
    // Anti-énumération : « compte introuvable » n'est jamais exposé distinctement, quel que soit l'appelant.
    case "USER_NOT_FOUND":
    case "INVALID_EMAIL_OR_PASSWORD":
      return t("E-mail ou mot de passe incorrect.");
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return t("Un compte existe déjà avec cette adresse e-mail.");
    case "EMAIL_NOT_VERIFIED":
      return t("Votre adresse e-mail n’est pas encore vérifiée.");
    case "PASSWORD_TOO_SHORT":
      return t("Le mot de passe est trop court.");
    case "PASSWORD_TOO_LONG":
      return t("Le mot de passe est trop long.");
    case "INVALID_TOKEN":
      return t("Ce lien est invalide. Demandez-en un nouveau.");
    case "TOKEN_EXPIRED":
      return t("Ce lien a expiré. Demandez-en un nouveau.");
    case "RESET_PASSWORD_DISABLED":
      return t("La réinitialisation du mot de passe est indisponible.");
    case "FAILED_TO_CREATE_USER":
      return t("La création du compte a échoué. Veuillez réessayer.");
    case "FAILED_TO_CREATE_SESSION":
      return t("La connexion n’a pas pu être établie. Veuillez réessayer.");
    case "SESSION_EXPIRED":
      return t("Votre session a expiré. Reconnectez-vous.");
    case "INVALID_CODE":
      return t("Code invalide.");
    case "INVALID_BACKUP_CODE":
      return t("Code de secours invalide.");
    case "OTP_HAS_EXPIRED":
      return t("Ce code a expiré. Demandez-en un nouveau.");
    case "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE":
      return t("Trop de tentatives. Demandez un nouveau code.");
    case "ACCOUNT_TEMPORARILY_LOCKED":
      return t("Trop de tentatives échouées. Votre compte est temporairement verrouillé, réessayez plus tard.");
    case "INVALID_TWO_FACTOR_COOKIE":
      return t("La vérification a expiré. Reconnectez-vous.");
    case "TWO_FACTOR_NOT_ENABLED":
      return t("La double authentification n’est pas activée.");
    case "TOTP_NOT_ENABLED":
    case "TOTP_NOT_CONFIGURED":
      return t("L’application d’authentification n’est pas disponible.");
    case "TOTP_ALREADY_ENABLED":
      return t("Une application d’authentification est déjà liée à ce compte. Rechargez la page.");
    case "BACKUP_CODES_NOT_ENABLED":
      return t("Les codes de secours ne sont pas activés.");
    case "VERIFICATION_FAILED":
      return t("La vérification anti-robot a échoué. Veuillez réessayer.");
    case "MISSING_RESPONSE":
      return t("Veuillez valider la vérification anti-robot.");
    case "SERVICE_UNAVAILABLE":
      return t("La vérification anti-robot est momentanément indisponible.");
    case "OWNER_TWO_FACTOR_ONLY":
      return t("Le double facteur est réservé aux propriétaires.");
    case "OWNER_TWO_FACTOR_BOOTSTRAP_FAILED":
      return t("Impossible de préparer la vérification du propriétaire.");
    default:
      return fallback;
  }
}

/**
 * Message affichable pour l'erreur renvoyée par le client better-auth (`result.error`) : le code connu
 * d'abord ; sinon une réponse 429 (limitation de débit de better-auth, sans code) affiche le message
 * « Trop de requêtes » ; sinon le repli fourni.
 */
export function authResultErrorMessage(
  error: { code?: string | null; status?: number | null } | null | undefined,
  fallback: string,
): string {
  const rateLimited = error?.status === 429 ? t("Trop de requêtes. Réessaie dans un instant.") : fallback;
  return authErrorMessage(error?.code ?? undefined, rateLimited);
}
