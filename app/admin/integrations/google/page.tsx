export const dynamic = "force-dynamic";

export default function GoogleIntegrationPage() {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  const oauth = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
  const searchVerification = Boolean(process.env.GOOGLE_SITE_VERIFICATION);
  return (
    <main className="shell">
      <div className="card">
        <span className="badge">Google</span>
        <h1>Google Cloud & Search Console</h1>
        <p className="muted">
          Cette page n’affiche jamais les valeurs des secrets. Elle indique
          seulement si les composants nécessaires sont configurés.
        </p>
        <div className="check-grid">
          <div className={`check ${oauth ? "ok" : "missing"}`}>
            <strong>Google OAuth</strong>
            <span>
              {oauth
                ? "Client ID + secret configurés"
                : "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET manquants"}
            </span>
          </div>
          <div className={`check ${searchVerification ? "ok" : "info"}`}>
            <strong>Search Console</strong>
            <span>
              {searchVerification
                ? "Balise HTML configurée"
                : "Utiliser GOOGLE_SITE_VERIFICATION ou la validation DNS"}
            </span>
          </div>
          <div className="check ok">
            <strong>Sitemap</strong>
            <span>{base}/sitemap.xml</span>
          </div>
          <div className="check ok">
            <strong>Robots</strong>
            <span>{base}/robots.txt</span>
          </div>
        </div>
        <h2>Callback OAuth</h2>
        <code>{base}/api/auth/callback/google</code>
        <h2>API Search Console</h2>
        <p className="muted">
          Le helper serveur <code>lib/google/search-console.ts</code> sait
          appeler l’API avec un access token. Le flux de consentement Search
          Console et le stockage/rafraîchissement de ce token ne sont pas encore
          câblés : validez la propriété manuellement ou ajoutez ce flux avant
          d’automatiser les rapports.
        </p>
      </div>
    </main>
  );
}
