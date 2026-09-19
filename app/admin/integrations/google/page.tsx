import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function GoogleIntegrationPage() {
  await requireAdmin();
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const oauth = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const searchVerification = Boolean(process.env.GOOGLE_SITE_VERIFICATION);
  const checks = [
    {
      title: "Google OAuth",
      detail: oauth ? "Client et secret configurés" : "Variables OAuth manquantes",
      ok: oauth,
      icon: "key-round",
    },
    {
      title: "Search Console",
      detail: searchVerification ? "Balise HTML configurée" : "Validation DNS ou balise requise",
      ok: searchVerification,
      icon: "search-check",
    },
    { title: "Sitemap", detail: `${base}/sitemap.xml`, ok: true, icon: "map" },
    { title: "Robots", detail: `${base}/robots.txt`, ok: true, icon: "bot" },
  ];
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Intégrations"
        title="Google"
        description="État de Google OAuth, Search Console et des fichiers d’indexation."
      />
      <section className="admin-integration-grid">
        {checks.map((check) => (
          <article className="admin-panel admin-integration-card" key={check.title}>
            <span className={`admin-stat-icon ${check.ok ? "is-success" : "is-warning"}`}>
              <Icon i={check.icon} size={18} />
            </span>
            <div>
              <h2>{check.title}</h2>
              <p>{check.detail}</p>
            </div>
            <span className={`admin-status ${check.ok ? "is-success" : "is-pending"}`}>
              {check.ok ? "Configuré" : "À configurer"}
            </span>
          </article>
        ))}
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-icon">
              <Icon i="route" size={18} />
            </span>
            <div>
              <h2>URL de rappel OAuth</h2>
              <p>À enregistrer dans Google Cloud Console</p>
            </div>
          </div>
        </div>
        <code className="admin-code-block">{base}/api/auth/callback/google</code>
        <p className="admin-helper-copy">
          Les valeurs secrètes restent uniquement dans les variables d’environnement serveur et ne sont jamais affichées
          sur cette page.
        </p>
      </section>
    </AdminPage>
  );
}
