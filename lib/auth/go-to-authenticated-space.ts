/**
 * Après une connexion, une inscription ou une validation 2FA réussie : navigation COMPLÈTE vers /auth/continue.
 * Cette page serveur redirige selon le rôle (client → /dashboard, administrateur → /admin, voir
 * `authenticatedDestination`). Un router.push + router.refresh télescopait deux navigations client et laissait
 * une page blanche en WebView (application Android/iOS) tant que l'application n'était pas relancée.
 * Point d'entrée unique : ne pas réintroduire de router.push("/auth/continue").
 */
export function goToAuthenticatedSpace() {
  window.location.assign(new URL("/auth/continue", window.location.origin).toString());
}
