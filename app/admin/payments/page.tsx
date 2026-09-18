import { requireAdmin } from "@/lib/auth/session";
import { desc } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { payments } from "@/db/schema";
export default async function Page() {
  await requireAdmin();
  const db = getServiceDb();
  const rows = await db
    .select()
    .from(payments)
    .orderBy(desc(payments.createdAt))
    .limit(200);
  return (
    <main className="shell">
      <h1>Paiements</h1>
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Référence</th>
            <th>Provider</th>
            <th>Montant</th>
            <th>Statut</th>
            <th>External ID</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>{p.createdAt.toLocaleString("fr-FR")}</td>
              <td>{p.reference}</td>
              <td>{p.provider}</td>
              <td>
                {p.amount.toLocaleString("fr-FR")} {p.currency}
              </td>
              <td>
                <span className="badge">{p.status}</span>
              </td>
              <td>{p.providerPaymentId ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
