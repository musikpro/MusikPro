import { isNativeMobileApp } from "@/lib/mobile/native-runtime";
import { getOAuthErrorMessage } from "@/lib/auth/oauth-error";

/**
 * Connexion Google dans l'application Android/iOS (Capacitor), sans quitter l'application.
 *
 * Le flux web classique redirige vers accounts.google.com : Capacitor l'ouvre alors dans Chrome (et
 * Google refuse l'OAuth dans une WebView), si bien que la session se crée hors de l'application. Ici,
 * le plugin natif affiche la fenêtre de choix de compte du système et renvoie un jeton Google
 * (`idToken`) que le serveur vérifie (Better Auth `signIn.social` avec `idToken`) : le cookie de
 * session est posé directement dans la WebView de l'application.
 */
export const NATIVE_GOOGLE_CANCELLED = "native-google-cancelled";

export function canUseNativeGoogleSignIn(webClientId: string | undefined): webClientId is string {
  return Boolean(webClientId) && isNativeMobileApp();
}

export async function nativeGoogleIdToken(webClientId: string): Promise<string> {
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  await SocialLogin.initialize({ google: { webClientId, mode: "online" } });
  try {
    // Pas de `scopes` : le plugin les refuse sans modifier MainActivity ; il ajoute déjà e-mail, profil et
    // openid par défaut, donc l'idToken contient ce qu'il faut.
    const login = await SocialLogin.login({ provider: "google", options: {} });
    const result = login.result as { idToken?: string | null } | undefined;
    if (!result?.idToken) throw new Error("Jeton Google manquant");
    return result.idToken;
  } catch (error) {
    // Fermeture de la fenêtre de choix de compte : ce n'est pas une erreur à afficher.
    const message = error instanceof Error ? error.message : String(error);
    if (/cancel|dismiss|closed|12501/i.test(message)) throw new Error(NATIVE_GOOGLE_CANCELLED);
    // Erreurs de configuration Google côté appareil (clé de signature non déclarée dans Google Cloud, écran de
    // consentement, compte restreint…) : le texte technique du plugin n'a aucun sens pour un client.
    if (/reauth|\[16\]|\[10\]|developer_error|credential|google sign-in failed/i.test(message)) {
      throw new Error(getOAuthErrorMessage("native_unavailable"));
    }
    throw error;
  }
}
