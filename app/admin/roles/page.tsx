import { desc, inArray } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { user } from "@/db/schema";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { getNameInitials } from "@/lib/profile/name-initials";
import {
  ADMIN_ROLES,
  ADMIN_ROLE_META,
  ALL_MODULES,
  MODULE_META,
  ROLE_PERMISSIONS,
  type AdminAppRole,
} from "@/lib/auth/permissions";

export default async function AdminRolesPage() {
  await requireAdmin();
  const db = getServiceDb();
  const admins = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      verified: user.emailVerified,
      createdAt: user.createdAt,
      role: user.role,
    })
    .from(user)
    .where(inArray(user.role, ADMIN_ROLES))
    .orderBy(desc(user.createdAt));
  const roleLabel = (role: string | null) =>
    role && role in ADMIN_ROLE_META ? ADMIN_ROLE_META[role as AdminAppRole].label : "Rôle inconnu";
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sécurité"
        title="Rôles & accès"
        description="Consulte les rôles disponibles, l’équipe administratrice et la matrice de permissions."
      />
      <section className="admin-insight-grid">
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="shield-check" size={18} />
              </span>
              <div>
                <h2>Rôles disponibles</h2>
                <p>Modèle Better Auth actuel</p>
              </div>
            </div>
          </div>
          <div className="admin-role-list">
            {ADMIN_ROLES.map((role) => (
              <div key={role}>
                <span>
                  <Icon i={ADMIN_ROLE_META[role].icon} size={17} />
                </span>
                <div>
                  <strong>{ADMIN_ROLE_META[role].label}</strong>
                  <small>{ADMIN_ROLE_META[role].description}</small>
                </div>
              </div>
            ))}
            <div>
              <span>
                <Icon i="user" size={17} />
              </span>
              <div>
                <strong>Utilisateur</strong>
                <small>Accès à son espace personnel</small>
              </div>
            </div>
          </div>
        </article>
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="users" size={18} />
              </span>
              <div>
                <h2>Équipe administratrice</h2>
                <p>
                  {admins.length} compte{admins.length > 1 ? "s" : ""} admin
                </p>
              </div>
            </div>
          </div>
          {admins.length ? (
            <div className="admin-record-list">
              {admins.map((entry) => (
                <div className="admin-record" key={entry.id}>
                  <span className="admin-user-initial" aria-hidden="true">
                    {getNameInitials(entry.name)}
                  </span>
                  <div>
                    <strong>{entry.name}</strong>
                    <small>{entry.email}</small>
                  </div>
                  <div className="admin-record-value">
                    <strong>{roleLabel(entry.role)}</strong>
                    <span className={`admin-status ${entry.verified ? "is-success" : "is-pending"}`}>
                      {entry.verified ? "Vérifié" : "À vérifier"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <Icon i="users" size={22} />
              <strong>Aucun administrateur</strong>
              <p>Aucun compte admin n’a été retourné.</p>
            </div>
          )}
        </article>
      </section>
      <article className="admin-panel admin-permission-matrix">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-icon">
              <Icon i="table" size={18} />
            </span>
            <div>
              <h2>Matrice de permissions</h2>
              <p>Vue en lecture seule, définie dans le code — pas encore appliquée aux accès réels.</p>
            </div>
          </div>
        </div>
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Permission</th>
                {ADMIN_ROLES.map((role) => (
                  <th key={role}>{ADMIN_ROLE_META[role].label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_MODULES.map((module) => (
                <tr key={module}>
                  <td>{MODULE_META[module].label}</td>
                  {ADMIN_ROLES.map((role) => (
                    <td key={role} style={{ textAlign: "center" }}>
                      {ROLE_PERMISSIONS[role].includes(module) ? (
                        <Icon i="check" size={16} />
                      ) : (
                        <span aria-hidden="true">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </AdminPage>
  );
}
