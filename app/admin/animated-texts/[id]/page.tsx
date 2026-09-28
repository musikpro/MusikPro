import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminHeroAnimatedTextForm from "@/components/admin/AdminHeroAnimatedTextForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { heroAnimatedTexts } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { updateHeroAnimatedText } from "../actions";

export default async function AdminEditHeroAnimatedTextPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [row] = await getServiceDb().select().from(heroAnimatedTexts).where(eq(heroAnimatedTexts.id, id)).limit(1);
  if (!row) notFound();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/animated-texts" />
      <AdminPageHeader
        eyebrow="Textes animés"
        title={`Modifier « ${row.label} »`}
        description="Les changements apparaîtront dans le Hero de la landing publique."
      />
      <AdminHeroAnimatedTextForm action={updateHeroAnimatedText} values={row} />
    </AdminPage>
  );
}
