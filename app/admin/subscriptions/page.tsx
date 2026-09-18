import { requireAdmin } from "@/lib/auth/session";
import { desc, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { subscriptions, plans, user } from "@/db/schema";
export default async function Page() {
  await requireAdmin();
  const db = getServiceDb();
  const rows = await db
    .select({ sub: subscriptions, plan: plans, user })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .leftJoin(user, eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(200);
  return (
    <main className="shell">
      <h1>Abonnements</h1>
      <table className="table">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Plan</th>
            <th>Provider</th>
            <th>Statut</th>
            <th>Renouvellement</th>
            <th>Fin de période</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.sub.id}>
              <td>{r.user?.email ?? r.sub.userId}</td>
              <td>{r.plan?.name ?? r.sub.planId}</td>
              <td>{r.sub.provider}</td>
              <td>{r.sub.status}</td>
              <td>{r.sub.renewalMode}</td>
              <td>
                {r.sub.currentPeriodEnd?.toLocaleDateString("fr-FR") ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
