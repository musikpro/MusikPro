import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminMoodForm from "@/components/admin/AdminMoodForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { moods } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { updateMood } from "../actions";

export default async function AdminEditMoodPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [mood] = await getServiceDb().select().from(moods).where(eq(moods.id, id)).limit(1);
  if (!mood) notFound();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/moods" />
      <AdminPageHeader
        eyebrow="Ambiances"
        title={`Modifier ${mood.name}`}
        description="Les changements apparaîtront dans les parcours client réel et démo."
      />
      <AdminMoodForm action={updateMood} values={mood} />
    </AdminPage>
  );
}
