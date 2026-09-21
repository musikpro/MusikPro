import AdminCreditPlanForm from "@/components/admin/AdminCreditPlanForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";
import { createPlan } from "../actions";

export default async function AdminNewCreditPlanPage() {
  await requireAdmin();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/plans" />
      <AdminPageHeader eyebrow="Crédits & tarifs" title="Nouvelle offre de crédits" description="Crée une offre qui apparaîtra automatiquement dans les espaces client réel et démo." />
      <section className="admin-panel admin-editor-card">
        <AdminCreditPlanForm action={createPlan} />
      </section>
    </AdminPage>
  );
}
