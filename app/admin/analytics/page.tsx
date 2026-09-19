import { and, count, eq, gte, sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { payments, subscriptions, user } from "@/db/schema";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const db = getServiceDb();
  const [[users], [activeSubscriptions], [revenue], [paid], [failed]] = await Promise.all([
    db.select({ value: count() }).from(user),
    db.select({ value: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
    db
      .select({ value: sql<number>`coalesce(sum(${payments.amount}), 0)::float` })
      .from(payments)
      .where(and(eq(payments.status, "paid"), gte(payments.createdAt, monthStart))),
    db.select({ value: count() }).from(payments).where(eq(payments.status, "paid")),
    db.select({ value: count() }).from(payments).where(eq(payments.status, "failed")),
  ]);
  const paidCount = Number(paid?.value ?? 0);
  const failedCount = Number(failed?.value ?? 0);
  const success = paidCount + failedCount ? (paidCount / (paidCount + failedCount)) * 100 : 0;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Mesure"
        title="Analytics"
        description="Indicateurs calculés depuis les données financières et utilisateurs disponibles."
      />
      <section className="admin-metric-row">
        <AdminMetric
          icon="banknote"
          value={`${Number(revenue?.value ?? 0).toLocaleString("fr-FR")} FCFA`}
          label="Revenus du mois"
          note="Paiements confirmés"
        />
        <AdminMetric
          icon="users"
          value={Number(users?.value ?? 0).toLocaleString("fr-FR")}
          label="Utilisateurs"
          note="Comptes enregistrés"
        />
        <AdminMetric
          icon="refresh-cw"
          value={Number(activeSubscriptions?.value ?? 0).toLocaleString("fr-FR")}
          label="Abonnements actifs"
          note="Statut actif"
          tone="success"
        />
        <AdminMetric
          icon="badge-check"
          value={`${success.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`}
          label="Succès paiement"
          note={`${paidCount + failedCount} transactions finalisées`}
          tone="success"
        />
      </section>
      <section className="admin-insight-grid">
        <article className="admin-panel admin-module-empty">
          <span>
            <Icon i="chart-no-axes-combined" size={26} />
          </span>
          <h2>Séries temporelles à connecter</h2>
          <p>Les graphiques par jour nécessitent une agrégation dédiée et une définition métier stable des périodes.</p>
          <span className="admin-status is-pending">À connecter</span>
        </article>
        <article className="admin-panel admin-module-empty">
          <span>
            <Icon i="map-pinned" size={26} />
          </span>
          <h2>Répartition géographique à connecter</h2>
          <p>
            Le pays n’est renseigné que sur certains paiements et ne permet pas encore une analyse fiable des
            utilisateurs.
          </p>
          <span className="admin-status is-pending">À connecter</span>
        </article>
      </section>
    </AdminPage>
  );
}
