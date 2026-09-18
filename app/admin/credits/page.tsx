import { requireAdmin } from "@/lib/auth/session";
import { desc, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { credits, user } from "@/db/schema";
import { setCredits } from "./actions";
export default async function Page() {
  await requireAdmin();
  const db = getServiceDb();
  const rows = await db
    .select({ credit: credits, email: user.email, name: user.name })
    .from(credits)
    .leftJoin(user, eq(credits.userId, user.id))
    .orderBy(desc(credits.updatedAt))
    .limit(100);
  return (
    <main className="shell">
      <h1>Crédits</h1>
      <form className="card" action={setCredits}>
        <div className="grid">
          <label className="field">
            E-mail utilisateur
            <input type="email" name="email" required />
          </label>
          <label className="field">
            Nouveau solde
            <input type="number" name="balance" min="0" step="1" required />
          </label>
        </div>
        <button className="btn">Mettre à jour</button>
      </form>
      <h2>Soldes</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Crédits</th>
            <th>Mise à jour</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.credit.id}>
              <td>
                {r.name ?? "—"}
                <br />
                <span className="muted">{r.email ?? r.credit.userId}</span>
              </td>
              <td>{r.credit.balance}</td>
              <td>{r.credit.updatedAt.toLocaleString("fr-FR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
