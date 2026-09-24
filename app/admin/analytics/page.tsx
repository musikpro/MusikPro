import { and, count, eq, gte, sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { payments, subscriptions, user } from "@/db/schema";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import AdminDailyBarChart from "@/components/admin/AdminDailyBarChart";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import {
  countryDisplayName,
  countryFlagEmoji,
  getDailyActivitySeries,
  getPaymentCountryBreakdown,
} from "@/lib/admin/analytics";

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const db = getServiceDb();
  const [[users], [activeSubscriptions], [revenue], [paid], [failed], dailySeries, countryBreakdown] =
    await Promise.all([
      db.select({ value: count() }).from(user),
      db.select({ value: count() }).from(subscriptions).where(eq(subscriptions.status, "active")),
      db
        .select({ value: sql<number>`coalesce(sum(${payments.amount}), 0)::float` })
        .from(payments)
        .where(and(eq(payments.status, "paid"), gte(payments.createdAt, monthStart))),
      db.select({ value: count() }).from(payments).where(eq(payments.status, "paid")),
      db.select({ value: count() }).from(payments).where(eq(payments.status, "failed")),
      getDailyActivitySeries(30),
      getPaymentCountryBreakdown(10),
    ]);
  const paidCount = Number(paid?.value ?? 0);
  const failedCount = Number(failed?.value ?? 0);
  const success = paidCount + failedCount ? (paidCount / (paidCount + failedCount)) * 100 : 0;
  const totalNewUsers = dailySeries.reduce((sum, point) => sum + point.newUsers, 0);
  const totalSongs = dailySeries.reduce((sum, point) => sum + point.songs, 0);
  const totalRevenue = dailySeries.reduce((sum, point) => sum + point.revenue, 0);
  const maxCountryPayments = Math.max(...countryBreakdown.map((row) => row.paymentsCount), 0);
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
        <article className="admin-panel admin-insight-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="chart-no-axes-combined" size={18} />
              </span>
              <div>
                <h2>Activité sur 30 jours</h2>
                <p>Nouveaux comptes, chansons générées et revenus confirmés, jour par jour.</p>
              </div>
            </div>
          </div>
          <div className="admin-insight-charts">
            <AdminDailyBarChart
              title="Nouveaux utilisateurs"
              total={totalNewUsers.toLocaleString("fr-FR")}
              points={dailySeries.map((point) => ({ day: point.day, value: point.newUsers }))}
            />
            <AdminDailyBarChart
              title="Chansons générées"
              total={totalSongs.toLocaleString("fr-FR")}
              tone="success"
              points={dailySeries.map((point) => ({ day: point.day, value: point.songs }))}
            />
            <AdminDailyBarChart
              title="Revenus confirmés"
              total={`${totalRevenue.toLocaleString("fr-FR")} FCFA`}
              points={dailySeries.map((point) => ({ day: point.day, value: point.revenue }))}
            />
          </div>
        </article>
        <article className="admin-panel admin-insight-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="map-pinned" size={18} />
              </span>
              <div>
                <h2>Répartition géographique</h2>
                <p>
                  Le pays n’est renseigné que sur les paiements, pas sur le compte utilisateur : ceci reflète les
                  tentatives de paiement par pays, pas l’ensemble des utilisateurs.
                </p>
              </div>
            </div>
          </div>
          {countryBreakdown.length ? (
            <ul className="admin-country-list">
              {countryBreakdown.map((row) => (
                <li key={row.country}>
                  <span className="admin-country-flag">{countryFlagEmoji(row.country)}</span>
                  <span className="admin-country-name">{countryDisplayName(row.country)}</span>
                  <span className="admin-country-bar">
                    <span
                      style={{ width: `${maxCountryPayments ? (row.paymentsCount / maxCountryPayments) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="admin-country-count">{row.paymentsCount.toLocaleString("fr-FR")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="admin-empty-state">
              <Icon i="map-pinned" size={22} />
              <strong>Aucun paiement localisé</strong>
              <p>Dès qu’un paiement renseignera un pays, sa répartition apparaîtra ici.</p>
            </div>
          )}
        </article>
      </section>
    </AdminPage>
  );
}
