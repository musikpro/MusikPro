import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import AdminUsersTable from "@/components/admin/AdminUsersTable";
import { requireAdmin } from "@/lib/auth/session";
import { ownerTwoFactorEnabled } from "@/lib/auth/owner-two-factor";
import { ADMIN_ROLES, ADMIN_ROLE_META } from "@/lib/auth/permissions";
import { listCustomRoles } from "@/lib/auth/custom-roles";
import { getUsersStats, listUsersPage } from "@/lib/admin/users";
import { getUsersPerPage } from "@/lib/settings/admin-display";

export default async function AdminUsersPage() {
  await requireAdmin();
  const [customRolesList, pageSize] = await Promise.all([listCustomRoles(), getUsersPerPage()]);
  const [stats, initial] = await Promise.all([
    getUsersStats(customRolesList.map((role) => `custom:${role.id}`)),
    listUsersPage({ page: 1, pageSize, state: "all", query: "" }),
  ]);
  const roleOptions = [
    { value: "user", label: "Utilisateur" },
    ...ADMIN_ROLES.map((role) => ({ value: role, label: ADMIN_ROLE_META[role].label })),
    ...customRolesList.map((role) => ({ value: `custom:${role.id}`, label: role.name })),
  ];
  const { total, verified, admins, suspended } = stats;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Comptes"
        title="Utilisateurs"
        description={`${total.toLocaleString("fr-FR")} ${total > 1 ? "comptes" : "compte"}, du plus récent au plus ancien.`}
      />
      <section className="admin-metric-row admin-users-metrics">
        <AdminMetric icon="users" value={total.toLocaleString("fr-FR")} label="Comptes" note="Depuis le début" />
        <AdminMetric
          icon="badge-check"
          value={verified.toLocaleString("fr-FR")}
          label="E-mails vérifiés"
          tone="success"
        />
        <AdminMetric icon="shield-check" value={admins.toLocaleString("fr-FR")} label="Administrateurs" />
        <AdminMetric
          icon="user-x"
          value={suspended.toLocaleString("fr-FR")}
          label="Comptes suspendus"
          tone={suspended ? "warning" : "success"}
        />
      </section>
      <AdminUsersTable initial={initial} roleOptions={roleOptions} twoFactorAvailable={ownerTwoFactorEnabled()} />
    </AdminPage>
  );
}
