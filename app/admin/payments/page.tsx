import { desc } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { payments } from "@/db/schema";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import AdminPaymentsTable from "@/components/admin/AdminPaymentsTable";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const db = getServiceDb();
  const rows = await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(200);
  const paid = rows.filter((entry) => entry.status === "paid");
  const pending = rows.filter((entry) => entry.status === "pending").length;
  const failed = rows.filter((entry) => entry.status === "failed").length;
  const revenue = paid.reduce((total, entry) => total + entry.amount, 0);
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Finance"
        title="Paiements"
        description="Suis les transactions enregistrées et leur état de traitement."
      />
      <section className="admin-metric-row">
        <AdminMetric
          icon="banknote"
          value={`${revenue.toLocaleString("fr-FR")} FCFA`}
          label="Volume confirmé chargé"
          note="Jusqu’à 200 transactions"
        />
        <AdminMetric icon="badge-check" value={paid.length.toLocaleString("fr-FR")} label="Complétés" tone="success" />
        <AdminMetric icon="clock-3" value={pending.toLocaleString("fr-FR")} label="En attente" tone="warning" />
        <AdminMetric
          icon="circle-x"
          value={failed.toLocaleString("fr-FR")}
          label="Échoués"
          tone={failed ? "warning" : "success"}
        />
      </section>
      <AdminPaymentsTable
        rows={rows.map((entry) => ({
          id: entry.id,
          reference: entry.reference,
          provider: entry.provider,
          amount: entry.amount,
          currency: entry.currency,
          status: entry.status,
          method: entry.method,
          country: entry.country,
          createdAt: entry.createdAt.toISOString(),
        }))}
      />
    </AdminPage>
  );
}
