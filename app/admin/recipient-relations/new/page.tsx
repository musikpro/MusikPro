import AdminRecipientRelationForm from "@/components/admin/AdminRecipientRelationForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";
import { createRecipientRelation } from "../actions";

export default async function AdminNewRecipientRelationPage() {
  await requireAdmin();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/recipient-relations" />
      <AdminPageHeader
        eyebrow="Liens avec le destinataire"
        title="Nouveau lien"
        description="Ajoute une nouvelle relation proposée à l’étape « À qui est destinée la chanson ? »."
      />
      <AdminRecipientRelationForm action={createRecipientRelation} />
    </AdminPage>
  );
}
