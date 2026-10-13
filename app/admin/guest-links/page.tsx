import Link from "next/link";
import AdminGuestLinkRowActions from "@/components/admin/AdminGuestLinkRowActions";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { siteBaseUrl } from "@/lib/guest-links/base-url";
import { listGuestLinks } from "@/lib/guest-links/server";
import { getGuestLinkStats } from "@/lib/guest-links/stats";
import { emptyGuestLinkStats } from "@/lib/guest-links/stats-summary";
import { guestLinkUrl } from "@/lib/validation/guest-links";

const DESTINATION_LABELS: Record<string, string> = {
  create: "Formulaire de création",
  dashboard: "Tableau de bord invité",
};

function GuestLinkEntries({ stats }: { stats: ReturnType<typeof emptyGuestLinkStats> }) {
  if (!stats.total) return <small>Aucune entrée</small>;
  const returning = `${stats.returningVisits.toLocaleString("fr-FR")} retour${stats.returningVisits > 1 ? "s" : ""}`;
  return (
    <div className="admin-guest-link-entries">
      <strong>{stats.total.toLocaleString("fr-FR")}</strong>
      <small>
        7 j : {stats.last7Days.toLocaleString("fr-FR")} · 30 j : {stats.last30Days.toLocaleString("fr-FR")}
      </small>
      <small>
        {returning}
        {stats.lastEntryAt ? ` · dernière le ${stats.lastEntryAt.toLocaleDateString("fr-FR")}` : ""}
      </small>
      {stats.topSources.length ? (
        <small>{stats.topSources.map((item) => `${item.source} (${item.entries})`).join(" · ")}</small>
      ) : null}
    </div>
  );
}

export default async function AdminGuestLinksPage() {
  await requireAdmin();
  const [rows, stats] = await Promise.all([listGuestLinks(), getGuestLinkStats().catch(() => null)]);
  const baseUrl = siteBaseUrl();
  const activeCount = rows.filter((row) => row.active).length;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Configuration"
        title="Liens du mode invité"
        description="Un lien invité permet à un visiteur sans compte de commencer sa chanson. La connexion ne lui est demandée qu’au moment d’obtenir des crédits. Supprimer un lien le place dans la Corbeille."
        action={{ href: "/admin/guest-links/new", label: "Nouveau lien" }}
      />
      <section className="admin-metric-row admin-metrics-compact">
        <AdminMetric icon="link" value={activeCount.toLocaleString("fr-FR")} label="Liens actifs" />
        <AdminMetric
          icon="link-2-off"
          value={(rows.length - activeCount).toLocaleString("fr-FR")}
          label="Liens désactivés"
        />
        {stats ? (
          <AdminMetric
            icon="users"
            value={[...stats.values()].reduce((sum, item) => sum + item.last7Days, 0).toLocaleString("fr-FR")}
            label="Entrées sur 7 jours"
          />
        ) : null}
      </section>
      {!stats ? (
        <div className="admin-source-notice">
          <Icon i="info" size={18} />
          <div>
            <strong>Statistiques indisponibles</strong>
            <p>Les compteurs d’entrées n’ont pas pu être lus. Les liens restent utilisables.</p>
          </div>
        </div>
      ) : null}
      {rows.length ? (
        <section className="admin-panel admin-table-panel admin-guest-links-table">
          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Lien</th>
                  <th>Destination</th>
                  <th>État</th>
                  <th>Entrées</th>
                  <th>Créé le</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const url = guestLinkUrl(baseUrl, row.slug);
                  return (
                    <tr key={row.id}>
                      <td className="admin-table-primary" data-label="Lien">
                        <strong>{row.label}</strong>
                        <span className="admin-guest-link-url">{url}</span>
                        {row.note ? <small>{row.note}</small> : null}
                      </td>
                      <td data-label="Destination">
                        <span className="admin-guest-link-destination">
                          <Icon i={row.destination === "dashboard" ? "layout-dashboard" : "square-pen"} size={13} />
                          {DESTINATION_LABELS[row.destination] ?? row.destination}
                        </span>
                      </td>
                      <td data-label="État">
                        <span className={`admin-status ${row.active ? "is-success" : "is-pending"}`}>
                          {row.active ? "Actif" : "Désactivé"}
                        </span>
                      </td>
                      <td data-label="Entrées">
                        {stats ? <GuestLinkEntries stats={stats.get(row.id) ?? emptyGuestLinkStats()} /> : "—"}
                      </td>
                      <td data-label="Créé le">{row.createdAt.toLocaleDateString("fr-FR")}</td>
                      <td data-label="Actions">
                        <AdminGuestLinkRowActions id={row.id} label={row.label} url={url} active={row.active} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="admin-empty-state admin-catalog-empty">
          <Icon i="link" size={24} />
          <strong>Aucun lien invité</strong>
          <p>Crée un lien à placer dans tes publicités : le visiteur commence sa chanson sans compte.</p>
          <Link className="admin-primary-action" href="/admin/guest-links/new">
            <Icon i="plus" size={16} /> Créer un lien
          </Link>
        </div>
      )}
    </AdminPage>
  );
}
