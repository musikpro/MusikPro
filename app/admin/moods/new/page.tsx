import AdminMoodForm from "@/components/admin/AdminMoodForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";
import { createMood } from "../actions";

export default async function AdminNewMoodPage() {
  await requireAdmin();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/moods" />
      <AdminPageHeader
        eyebrow="Ambiances"
        title="Nouvelle ambiance"
        description="Ajoute une ambiance au choix « style et ambiance » du parcours de création client."
      />
      <AdminMoodForm action={createMood} />
    </AdminPage>
  );
}
