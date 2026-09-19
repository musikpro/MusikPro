import {
  AdminEmptyModule,
  AdminMetric,
  AdminPage,
  AdminPageHeader,
  AdminSourceNotice,
} from "@/components/admin/AdminPage";
import { count, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { payments, user } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminFunnelPage() {
  await requireAdmin();
  const db = getServiceDb();
  const [[users], [paid]] = await Promise.all([
    db.select({ value: count() }).from(user),
    db.select({ value: count() }).from(payments).where(eq(payments.status, "paid")),
  ]);
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Conversion"
        title="Entonnoir"
        description="Analyse le parcours depuis l’inscription jusqu’au paiement confirmé."
      />
      <AdminSourceNotice>
        Les événements de visite, de démarrage de création et d’abandon ne sont pas encore collectés. Seuls les comptes
        et paiements confirmés proviennent de Neon.
      </AdminSourceNotice>
      <section className="admin-metric-row">
        <AdminMetric
          icon="users"
          value={Number(users?.value ?? 0).toLocaleString("fr-FR")}
          label="Comptes créés"
          note="Donnée Neon"
        />
        <AdminMetric
          icon="badge-check"
          value={Number(paid?.value ?? 0).toLocaleString("fr-FR")}
          label="Paiements confirmés"
          note="Donnée Neon"
          tone="success"
        />
        <AdminMetric
          icon="mouse-pointer-click"
          value="—"
          label="Créations commencées"
          note="Événement à connecter"
          tone="warning"
        />
        <AdminMetric icon="music-2" value="—" label="Générations terminées" note="Source à connecter" tone="warning" />
      </section>
      <AdminEmptyModule
        icon="funnel"
        title="Suivi des étapes incomplet"
        description="Une table d’événements horodatés et une politique de conservation sont nécessaires pour calculer les abandons et les conversions sans inventer de données."
      />
    </AdminPage>
  );
}
