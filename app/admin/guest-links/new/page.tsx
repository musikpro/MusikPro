import AdminGuestLinkForm from "@/components/admin/AdminGuestLinkForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";
import { siteBaseUrl } from "@/lib/guest-links/base-url";
import { createGuestLinkAction } from "../actions";

export default async function AdminNewGuestLinkPage() {
  await requireAdmin();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/guest-links" />
      <AdminPageHeader
        eyebrow="Liens du mode invité"
        title="Nouveau lien"
        description="Choisis le nom, la fin du lien et l’écran où arrive le visiteur."
      />
      <AdminGuestLinkForm action={createGuestLinkAction} baseUrl={siteBaseUrl()} />
    </AdminPage>
  );
}
