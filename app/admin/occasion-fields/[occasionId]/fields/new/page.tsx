import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminOccasionFieldForm from "@/components/admin/AdminOccasionFieldForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { occasions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { createOccasionField } from "../../../actions";

export default async function AdminNewOccasionFieldPage({ params }: { params: Promise<{ occasionId: string }> }) {
  await requireAdmin();
  const { occasionId } = await params;
  const [occasion] = await getServiceDb().select({ name: occasions.name }).from(occasions).where(eq(occasions.id, occasionId)).limit(1);
  if (!occasion) notFound();
  return (
    <AdminPage>
      <AdminBackLink href={`/admin/occasion-fields/${occasionId}?tab=fields`} />
      <AdminPageHeader
        eyebrow={occasion.name}
        title="Nouveau champ"
        description="Ce champ apparaîtra à l’étape « Personnalise ta chanson » pour cette occasion."
      />
      <AdminOccasionFieldForm action={createOccasionField} occasionId={occasionId} />
    </AdminPage>
  );
}
