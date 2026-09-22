import AdminLanguageForm from "@/components/admin/AdminLanguageForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";
import { createLanguage } from "../actions";
export default async function Page() {
  await requireAdmin();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/languages" />
      <AdminPageHeader
        eyebrow="Langues"
        title="Ajouter une langue"
        description="Choisis si cette langue sert à l’interface, aux paroles, ou aux deux."
      />
      <AdminLanguageForm action={createLanguage} />
    </AdminPage>
  );
}
