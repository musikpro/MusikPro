import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminOccasionForm from "@/components/admin/AdminOccasionForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { occasions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { updateOccasion } from "../actions";

export default async function AdminEditOccasionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [occasion] = await getServiceDb().select().from(occasions).where(eq(occasions.id, id)).limit(1);
  if (!occasion) notFound();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/occasions" />
      <AdminPageHeader
        eyebrow="Occasions"
        title={`Modifier ${occasion.name}`}
        description="Les changements apparaîtront dans les parcours client réel et démo."
      />
      <AdminOccasionForm action={updateOccasion} values={occasion} />
    </AdminPage>
  );
}
