import { requireAdmin } from "@/lib/auth/session";
import { count, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { payments, plans, subscriptions, user } from "@/db/schema";
export default async function Page() {
  await requireAdmin();
  const db = getServiceDb();
  const [[u], [p], [s], [paid]] = await Promise.all([
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(plans),
    db
      .select({ n: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active")),
    db.select({ n: count() }).from(payments).where(eq(payments.status, "paid")),
  ]);
  return (
    <main className="shell">
      <h1>Administration</h1>
      <div className="grid">
        <div className="card">
          <h3>Utilisateurs</h3>
          <strong>{u.n}</strong>
        </div>
        <div className="card">
          <h3>Plans</h3>
          <strong>{p.n}</strong>
        </div>
        <div className="card">
          <h3>Abonnements actifs</h3>
          <strong>{s.n}</strong>
        </div>
        <div className="card">
          <h3>Paiements réussis</h3>
          <strong>{paid.n}</strong>
        </div>
      </div>
    </main>
  );
}
