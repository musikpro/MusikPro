import { redirect } from "next/navigation";
import AdminCustomRoleForm from "@/components/admin/AdminCustomRoleForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";
import { hasAppRole } from "@/lib/auth/permissions";
import { createCustomRole } from "../actions";

export default async function AdminNewCustomRolePage() {
  const session = await requireAdmin();
  if (!hasAppRole((session.user as { role?: string }).role, "admin")) redirect("/admin/roles");
  return (
    <AdminPage>
      <AdminBackLink href="/admin/roles" />
      <AdminPageHeader
        eyebrow="Rôles & accès"
        title="Ajouter un rôle"
        description="Crée un rôle personnalisé avec son propre jeu de permissions."
      />
      <section className="admin-panel admin-editor-card">
        <AdminCustomRoleForm action={createCustomRole} />
      </section>
    </AdminPage>
  );
}
