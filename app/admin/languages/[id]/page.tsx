import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminLanguageForm from "@/components/admin/AdminLanguageForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { languages } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { updateLanguage } from "../actions";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [language] = await getServiceDb().select().from(languages).where(eq(languages.id, id)).limit(1);
  if (!language) notFound();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/languages" />
      <AdminPageHeader
        eyebrow="Langues"
        title={`Modifier ${language.name}`}
        description="Les changements sont immédiatement partagés avec le parcours client."
      />
      <AdminLanguageForm action={updateLanguage} values={language} />
    </AdminPage>
  );
}
