import { desc, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { user } from "@/db/schema";
import { AdminPage, AdminPageHeader, AdminSourceNotice } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { getNameInitials } from "@/lib/profile/name-initials";

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
    })
    .from(user)
    .where(eq(user.role, "admin"))
    .orderBy(desc(user.createdAt));
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sécurité"
        title="Rôles & accès"
        description="Consulte les comptes disposant actuellement du rôle administrateur."
      />
      <AdminSourceNotice>
        Le schéma actuel distingue les rôles user et admin. La matrice détaillée de permissions montrée dans Banani
        nécessite un modèle d’autorisation supplémentaire.
      </AdminSourceNotice>
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
            <div>
              <span>
                <Icon i="shield" size={17} />
              </span>
              <div>
                <strong>Administrateur</strong>
                <small>Accès aux routes /admin et actions protégées</small>
              </div>
            </div>
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
                  <span className="admin-user-initial" aria-hidden="true">{getNameInitials(entry.name)}</span>
                  <div>
                    <strong>{entry.name}</strong>
                    <small>{entry.email}</small>
                  </div>
                  <div className="admin-record-value">
                    <strong>{entry.createdAt.toLocaleDateString("fr-FR")}</strong>
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
    </AdminPage>
  );
}
