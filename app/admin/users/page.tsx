import { desc } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { user } from "@/db/schema";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import AdminUsersTable from "@/components/admin/AdminUsersTable";
import { requireAdmin } from "@/lib/auth/session";
import { ownerTwoFactorEnabled } from "@/lib/auth/owner-two-factor";
import { ADMIN_ROLES, ADMIN_ROLE_META, isAdminRole } from "@/lib/auth/permissions";
import { listCustomRoles } from "@/lib/auth/custom-roles";

export default async function AdminUsersPage() {
  await requireAdmin();
  const db = getServiceDb();
  const users = await db.select().from(user).orderBy(desc(user.createdAt)).limit(200);
  const customRolesList = await listCustomRoles();
  const adminSlugs = customRolesList.map((role) => `custom:${role.id}`);
  const roleOptions = [
    { value: "user", label: "Utilisateur" },
    ...ADMIN_ROLES.map((role) => ({ value: role, label: ADMIN_ROLE_META[role].label })),
    ...customRolesList.map((role) => ({ value: `custom:${role.id}`, label: role.name })),
  ];
  const verified = users.filter((entry) => entry.emailVerified).length;
  const admins = users.filter((entry) => isAdminRole(entry.role, adminSlugs)).length;
  const suspended = users.filter((entry) => entry.banned).length;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Comptes"
        title="Utilisateurs"
        description={`${users.length.toLocaleString("fr-FR")} comptes récents chargés depuis Neon.`}
      />
      <section className="admin-metric-row admin-users-metrics">
        <AdminMetric
          icon="users"
          value={users.length.toLocaleString("fr-FR")}
          label="Comptes affichés"
          note="Limite 200"
        />
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
      <AdminUsersTable
        twoFactorAvailable={ownerTwoFactorEnabled()}
        roleOptions={roleOptions}
        rows={users.map((entry) => ({
          id: entry.id,
          name: entry.name,
          email: entry.email,
          createdAt: entry.createdAt.toISOString(),
          verified: entry.emailVerified,
          twoFactor: Boolean(entry.twoFactorEnabled),
          role: entry.role ?? "user",
          banned: Boolean(entry.banned),
        }))}
      />
    </AdminPage>
  );
}
