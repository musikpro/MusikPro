import AdminOccasionForm from "@/components/admin/AdminOccasionForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";
import { createOccasion } from "../actions";

export default async function AdminNewOccasionPage() {
  await requireAdmin();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/occasions" />
      <AdminPageHeader
        eyebrow="Occasions"
        title="Nouvelle occasion"
        description="Ajoute un nouveau point de départ au parcours de création client."
      />
      <AdminOccasionForm action={createOccasion} />
    </AdminPage>
  );
}
