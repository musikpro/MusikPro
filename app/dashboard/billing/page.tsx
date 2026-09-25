import { eq, desc } from "drizzle-orm";
import { db, userQuery } from "@/db";
import { payments, plans } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { DashboardNav } from "@/components/dashboard-nav";
import { CheckoutButton } from "@/components/checkout-button";
export default async function Page() {
  const s = await requireUser();
  const offers = await userQuery(s.user.id, db.select().from(plans).where(eq(plans.active, true)));
  const tx = await userQuery(
    s.user.id,
    db.select().from(payments).where(eq(payments.userId, s.user.id)).orderBy(desc(payments.createdAt)).limit(20),
  );
  return (
    <main className="shell">
      <DashboardNav />
      <h1>Plans et facturation</h1>
      <div className="grid">
        {offers.map((p) => (
          <div className="card" key={p.id}>
            <h2>{p.name}</h2>
            <p>{p.description}</p>
            <h3>
              {p.amount.toLocaleString("fr-FR")} {p.currency}/{p.interval === "year" ? "an" : "mois"}
            </h3>
            <CheckoutButton planId={p.id} />
          </div>
        ))}
      </div>
      <h2>Transactions</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Montant</th>
            <th>Fournisseur</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {tx.map((p) => (
            <tr key={p.id}>
              <td>{p.reference.slice(0, 18)}…</td>
              <td>
                {p.amount.toLocaleString("fr-FR")} {p.currency}
              </td>
              <td>{p.provider}</td>
              <td>
                <span className="badge">{p.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
