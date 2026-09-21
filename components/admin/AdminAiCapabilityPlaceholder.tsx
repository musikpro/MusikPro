import { AdminBackLink, AdminEmptyModule, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";

export default function AdminAiCapabilityPlaceholder({
  eyebrow,
  title,
  description,
  icon,
  message,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  message: string;
}) {
  return (
    <AdminPage>
      <AdminBackLink href="/admin/ai-providers" label="Toutes les capacités IA" />
      <AdminPageHeader eyebrow={eyebrow} title={title} description={description} />
      <AdminEmptyModule icon={icon} title="Fournisseur à choisir" description={message} />
    </AdminPage>
  );
}
