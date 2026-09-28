import AdminHeroAnimatedTextForm from "@/components/admin/AdminHeroAnimatedTextForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";
import { createHeroAnimatedText } from "../actions";

export default async function AdminNewHeroAnimatedTextPage() {
  await requireAdmin();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/animated-texts?tab=texts" />
      <AdminPageHeader
        eyebrow="Textes animés"
        title="Nouveau texte animé"
        description="Ajoute un mot ou une courte phrase à faire défiler sous le titre du Hero."
      />
      <AdminHeroAnimatedTextForm action={createHeroAnimatedText} />
    </AdminPage>
  );
}
