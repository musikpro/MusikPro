import { notFound } from "next/navigation";
import AdminGuestLinkForm from "@/components/admin/AdminGuestLinkForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";
import { siteBaseUrl } from "@/lib/guest-links/base-url";
import { getGuestLink } from "@/lib/guest-links/server";
import { updateGuestLinkAction } from "../actions";

export default async function AdminEditGuestLinkPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const link = await getGuestLink(id);
  if (!link) notFound();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/guest-links" />
      <AdminPageHeader
        eyebrow="Liens du mode invité"
        title={`Modifier ${link.label}`}
        description="Les changements s’appliquent à la prochaine visite, y compris pour les publicités déjà diffusées."
      />
      <AdminGuestLinkForm action={updateGuestLinkAction} baseUrl={siteBaseUrl()} values={link} />
    </AdminPage>
  );
}
