import Link from "next/link";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminCopyLinkButton from "@/components/admin/AdminCopyLinkButton";
import AdminTrashGuestLinkButton from "@/components/admin/AdminTrashGuestLinkButton";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { siteBaseUrl } from "@/lib/guest-links/base-url";
import { listGuestLinks } from "@/lib/guest-links/server";
import { guestLinkUrl } from "@/lib/validation/guest-links";
import { toggleGuestLinkAction, trashGuestLinkAction } from "./actions";

const DESTINATION_LABELS: Record<string, string> = {
  create: "Formulaire de création",
  dashboard: "Tableau de bord invité",
};

export default async function AdminGuestLinksPage() {
  await requireAdmin();
  const rows = await listGuestLinks();
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
      </section>
      <div className="admin-source-notice">
        <Icon i="info" size={18} />
        <div>
          <strong>Étape 1 sur 4 : gestion des liens</strong>
          <p>
            Les liens sont enregistrés dès maintenant. Ils ouvriront le parcours invité quand les étapes suivantes
            (entrée publique, portail de connexion) seront déployées.
          </p>
        </div>
      </div>
      {rows.length ? (
        <section className="admin-panel admin-table-panel">
          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Lien</th>
                  <th>Destination</th>
                  <th>État</th>
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
                        <small style={{ wordBreak: "break-all" }}>{url}</small>
                        {row.note ? <small>{row.note}</small> : null}
                      </td>
                      <td data-label="Destination">{DESTINATION_LABELS[row.destination] ?? row.destination}</td>
                      <td data-label="État">
                        <span className={`admin-status ${row.active ? "is-success" : "is-pending"}`}>
                          {row.active ? "Actif" : "Désactivé"}
                        </span>
                      </td>
                      <td data-label="Créé le">{row.createdAt.toLocaleDateString("fr-FR")}</td>
                      <td data-label="Actions">
                        <div className="admin-table-actions">
                          <AdminCopyLinkButton url={url} />
                          <Link
                            className="admin-secondary-action admin-style-edit"
                            href={`/admin/guest-links/${row.id}`}
                          >
                            <Icon i="pencil" size={15} /> Modifier
                          </Link>
                          <AdminActionForm action={toggleGuestLinkAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="active" value={String(row.active)} />
                            <button className="admin-secondary-action" type="submit">
                              <Icon i={row.active ? "pause" : "play"} size={15} />
                              {row.active ? "Désactiver" : "Activer"}
                            </button>
                          </AdminActionForm>
                          <AdminActionForm action={trashGuestLinkAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <AdminTrashGuestLinkButton label={row.label} />
                          </AdminActionForm>
                        </div>
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
