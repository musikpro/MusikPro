import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminRecipientRelationForm from "@/components/admin/AdminRecipientRelationForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { recipientRelations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { updateRecipientRelation } from "../actions";

export default async function AdminEditRecipientRelationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [relation] = await getServiceDb()
    .select()
    .from(recipientRelations)
    .where(eq(recipientRelations.id, id))
    .limit(1);
  if (!relation) notFound();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/recipient-relations" />
      <AdminPageHeader
        eyebrow="Liens avec le destinataire"
        title={`Modifier ${relation.name}`}
        description="Les changements apparaîtront dans les parcours client réel et démo."
      />
      <AdminRecipientRelationForm action={updateRecipientRelation} values={relation} />
    </AdminPage>
  );
}
