import { asc, desc, eq, sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { credits, payments, user } from "@/db/schema";
import AdminCreditAdjustForm from "@/components/admin/AdminCreditAdjustForm";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { adjustCredits } from "./actions";

export default async function AdminCreditsPage() {
  await requireAdmin();
  const db = getServiceDb();
  const [rows, [total], userOptions, recentBuyerRows] = await Promise.all([
    db
      .select({ credit: credits, email: user.email, name: user.name })
      .from(credits)
      .leftJoin(user, eq(credits.userId, user.id))
      .orderBy(desc(credits.updatedAt))
      .limit(100),
    db.select({ value: sql<number>`coalesce(sum(${credits.balance}), 0)::int` }).from(credits),
    db
      .select({ email: user.email, name: user.name, balance: sql<number>`coalesce(${credits.balance}, 0)::int` })
      .from(user)
      .leftJoin(credits, eq(credits.userId, user.id))
      .orderBy(asc(user.email))
      .limit(500),
    // The 10 customers whose last paid purchase is the most recent.
    db
      .select({
        email: user.email,
        name: user.name,
        balance: sql<number>`coalesce(${credits.balance}, 0)::int`,
        lastPaid: sql<Date>`max(coalesce(${payments.paidAt}, ${payments.createdAt}))`,
      })
      .from(payments)
      .innerJoin(user, eq(user.id, payments.userId))
      .leftJoin(credits, eq(credits.userId, user.id))
      .where(eq(payments.status, "paid"))
      .groupBy(user.id, user.email, user.name, credits.balance)
      .orderBy(desc(sql`max(coalesce(${payments.paidAt}, ${payments.createdAt}))`))
      .limit(10),
  ]);
  const toOption = (row: { email: string | null; name: string | null; balance: number }) =>
    row.email ? [{ email: row.email, name: row.name, balance: Number(row.balance) }] : [];
  const users = userOptions.flatMap(toOption);
  const recentBuyers = recentBuyerRows.flatMap(toOption);
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Soldes clients"
        title="Soldes crédits"
        description="Consulte et ajuste le solde de crédits disponible pour un utilisateur."
      />
      <section className="admin-metric-row">
        <AdminMetric
          icon="coins"
          value={Number(total?.value ?? 0).toLocaleString("fr-FR")}
          label="Crédits disponibles"
          note="Total des soldes"
        />
        <AdminMetric
          icon="users"
          value={rows.length.toLocaleString("fr-FR")}
          label="Soldes affichés"
          note="100 comptes maximum"
        />
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-icon">
              <Icon i="circle-plus" size={18} />
            </span>
            <div>
              <h2>Ajuster un solde</h2>
              <p>Ajoutez ou retirez des crédits. Chaque opération est journalisée.</p>
            </div>
          </div>
        </div>
        <AdminCreditAdjustForm action={adjustCredits} recentBuyers={recentBuyers} users={users} />
      </section>
      <section className="admin-panel admin-table-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-icon">
              <Icon i="list-music" size={18} />
            </span>
            <div>
              <h2>Soldes enregistrés</h2>
              <p>Dernières mises à jour en premier</p>
            </div>
          </div>
        </div>
        {rows.length ? (
          <div className="admin-data-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Crédits</th>
                  <th>Dernière mise à jour</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.credit.id}>
                    <td className="admin-table-primary" data-label="Utilisateur">
                      <strong>{row.name ?? "Utilisateur"}</strong>
                      <small>{row.email ?? row.credit.userId}</small>
                    </td>
                    <td data-label="Crédits">
                      <strong>{row.credit.balance}</strong>
                    </td>
                    <td data-label="Dernière mise à jour">{row.credit.updatedAt.toLocaleString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <Icon i="coins" size={22} />
            <strong>Aucun solde enregistré</strong>
            <p>Les soldes clients apparaîtront ici.</p>
          </div>
        )}
      </section>
    </AdminPage>
  );
}
