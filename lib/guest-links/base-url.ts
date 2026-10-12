/** Origine publique du site (sans barre finale), pour afficher les liens invités complets à copier. */
export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://musikpro.net").replace(/\/+$/, "");
}
