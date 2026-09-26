import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getServiceDb } from "@/db";
import { customRoles, user } from "@/db/schema";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminCustomRoleForm from "@/components/admin/AdminCustomRoleForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { hasAppRole, ALL_MODULES } from "@/lib/auth/permissions";
import type { CustomRoleFormValue } from "@/components/admin/AdminCustomRoleForm";
import { updateCustomRole, deleteCustomRole } from "../../actions";

export default async function AdminEditCustomRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireAdmin();
  if (!hasAppRole((session.user as { role?: string }).role, "admin")) redirect("/admin/roles");
  const db = getServiceDb();
  const [role] = await db.select().from(customRoles).where(eq(customRoles.id, id)).limit(1);
  if (!role) notFound();
  const slug = `custom:${id}`;
  const members = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.role, slug));
  const permissions = Array.isArray(role.permissions) ? (role.permissions as string[]) : [];
  const deleteFormId = `delete-role-${id}`;
  return (
    <AdminPage>
      <AdminBackLink href="/admin/roles" />
      <AdminPageHeader
        eyebrow="Rôles & accès"
        title={`Modifier « ${role.name} »`}
        description={role.description || "Rôle personnalisé"}
      />
      <section className="admin-insight-grid">
        <article className="admin-panel admin-editor-card">
          <AdminCustomRoleForm
            action={updateCustomRole}
            role={{
              id: role.id,
              name: role.name,
              description: role.description,
              color: role.color as CustomRoleFormValue["color"],
              permissions,
            }}
          />
        </article>
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="info" size={18} />
              </span>
              <div>
                <h2>État actuel</h2>
                <p>Résumé du rôle</p>
              </div>
            </div>
          </div>
          <dl className="admin-role-summary">
            <div>
              <dt>Membres</dt>
              <dd>{members.length}</dd>
            </div>
            <div>
              <dt>Permissions actives</dt>
              <dd>
                {permissions.length} sur {ALL_MODULES.length}
              </dd>
            </div>
            <div>
              <dt>Créé le</dt>
              <dd>{new Date(role.createdAt).toLocaleDateString("fr-FR")}</dd>
            </div>
            <div>
              <dt>Modifié le</dt>
              <dd>{new Date(role.updatedAt).toLocaleDateString("fr-FR")}</dd>
            </div>
          </dl>
        </article>
      </section>
      <article className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-icon">
              <Icon i="users" size={18} />
            </span>
            <div>
              <h2>Membres assignés</h2>
              <p>
                {members.length} compte{members.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
        {members.length ? (
          <div className="admin-record-list">
            {members.map((member) => (
              <div className="admin-record" key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.email}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">
            <Icon i="users" size={22} />
            <strong>Aucun membre</strong>
            <p>Assigne ce rôle depuis la page Utilisateurs.</p>
          </div>
        )}
      </article>
      <article className="admin-panel admin-danger-zone">
        <h3>Zone dangereuse</h3>
        <AdminActionForm id={deleteFormId} action={deleteCustomRole}>
          <input type="hidden" name="id" value={role.id} />
        </AdminActionForm>
        <p>
          {members.length
            ? `Réassigne d’abord les ${members.length} membre(s) de ce rôle depuis la page Utilisateurs avant de pouvoir le supprimer.`
            : "Cette action est définitive."}
        </p>
        <button type="submit" form={deleteFormId} className="admin-secondary-action is-danger" disabled={members.length > 0}>
          <Icon i="trash-2" size={16} />
          Supprimer ce rôle
        </button>
      </article>
    </AdminPage>
  );
}
