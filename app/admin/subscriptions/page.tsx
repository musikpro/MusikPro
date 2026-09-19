import { desc, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { plans, subscriptions, user } from "@/db/schema";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminSubscriptionsPage() {
  await requireAdmin();
  const db = getServiceDb();
  const rows = await db
    .select({ sub: subscriptions, plan: plans, user })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .leftJoin(user, eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(200);
  const active = rows.filter((row) => row.sub.status === "active").length;
  const pending = rows.filter((row) => row.sub.status === "pending").length;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Finance"
        title="Abonnements"
        description="Suis les accès récurrents et leur échéance de renouvellement."
      />
      <section className="admin-metric-row">
        <AdminMetric
          icon="refresh-cw"
          value={rows.length.toLocaleString("fr-FR")}
          label="Abonnements affichés"
          note="200 maximum"
        />
        <AdminMetric icon="badge-check" value={active.toLocaleString("fr-FR")} label="Actifs" tone="success" />
        <AdminMetric icon="clock-3" value={pending.toLocaleString("fr-FR")} label="En attente" tone="warning" />
      </section>
      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-icon">
              <Icon i="refresh-cw" size={18} />
            </span>
            <div>
              <h2>Abonnements enregistrés</h2>
              <p>Données Neon actualisées à l’ouverture</p>
            </div>
          </div>
        </div>
        {rows.length ? (
          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Pack</th>
                  <th>Provider</th>
                  <th>Statut</th>
                  <th>Renouvellement</th>
                  <th>Fin de période</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.sub.id}>
                    <td className="admin-table-primary">
                      <strong>{row.user?.name ?? "Utilisateur"}</strong>
                      <small>{row.user?.email ?? row.sub.userId}</small>
                    </td>
                    <td>{row.plan?.name ?? "Pack supprimé"}</td>
                    <td>{row.sub.provider}</td>
                    <td>
                      <span
                        className={`admin-status ${row.sub.status === "active" ? "is-success" : row.sub.status === "failed" ? "is-danger" : "is-pending"}`}
                      >
                        {row.sub.status}
                      </span>
                    </td>
                    <td>{row.sub.renewalMode}</td>
                    <td>{row.sub.currentPeriodEnd?.toLocaleDateString("fr-FR") ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <Icon i="refresh-cw" size={22} />
            <strong>Aucun abonnement</strong>
            <p>Les abonnements apparaîtront ici.</p>
          </div>
        )}
      </section>
    </AdminPage>
  );
}
