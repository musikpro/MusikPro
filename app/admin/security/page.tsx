import Link from "next/link";
import { desc } from "drizzle-orm";
import Icon from "@/components/banani/Icon";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { user } from "@/db/schema";
import { ADMIN_ROLE_META, ADMIN_ROLES, isAdminRole } from "@/lib/auth/permissions";
import { getActiveCustomRoleSlugs, listCustomRoles } from "@/lib/auth/custom-roles";
import { ownerTwoFactorEnabled } from "@/lib/auth/owner-two-factor";
import { requireAdmin } from "@/lib/auth/session";
import { getNameInitials } from "@/lib/profile/name-initials";

export const dynamic = "force-dynamic";

/**
 * Sécurité — double facteur des propriétaires. Réservé aux comptes d'administration (Super Admin,
 * financier, support, rôles personnalisés…) ; les clients ne sont jamais concernés. Le
 * commutateur est la variable d'environnement OWNER_2FA_ENABLED (lib/auth/owner-two-factor.ts).
 */
export default async function AdminSecurityPage() {
  const session = await requireAdmin();
  const enabled = ownerTwoFactorEnabled();
  const [customRoles, adminSlugs, accounts] = await Promise.all([
    listCustomRoles(),
    getActiveCustomRoleSlugs(),
    getServiceDb().select().from(user).orderBy(desc(user.createdAt)).limit(500),
  ]);
  const roleLabels = new Map<string, string>([
    ...ADMIN_ROLES.map((role): [string, string] => [role, ADMIN_ROLE_META[role].label]),
    ...customRoles.map((role): [string, string] => [`custom:${role.id}`, role.name]),
  ]);
  const owners = accounts.filter((entry) => isAdminRole(entry.role, adminSlugs));
  const protectedCount = owners.filter((entry) => entry.twoFactorEnabled).length;
  const me = owners.find((entry) => entry.id === session.user.id);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Système"
        title="Sécurité"
        description="Double facteur de connexion réservé aux propriétaires du SaaS (Super Admin, financier, support et comptes attribués). Les clients ne sont pas concernés."
      />

      <section className="admin-metric-row">
        <AdminMetric
          icon="shield-check"
          value={enabled ? "Activé" : "Désactivé"}
          label="Double facteur propriétaires"
          tone={enabled ? "success" : "warning"}
        />
        <AdminMetric icon="users" value={owners.length.toLocaleString("fr-FR")} label="Comptes propriétaires" />
        <AdminMetric
          icon="badge-check"
          value={`${protectedCount}/${owners.length}`}
          label="Protégés par le double facteur"
          tone={enabled && protectedCount === owners.length ? "success" : "warning"}
        />
      </section>

      <section className="admin-panel">
        <div className="admin-provider-heading">
          <span className="admin-catalog-icon">
            <Icon i="key-round" size={20} />
          </span>
          <div>
            <h2>Comment ça fonctionne</h2>
            <p>
              Quand le double facteur est activé, chaque propriétaire reçoit par e-mail un code à 6 chiffres à chaque
              connexion, et peut en plus lier une application d’authentification (Google Authenticator…) pour remplacer
              le code e-mail. Sans validation, l’accès à l’administration est refusé. Aucun client n’est soumis à cette
              étape.
            </p>
          </div>
          <span className={`admin-status ${enabled ? "is-success" : "is-pending"}`}>
            {enabled ? "Actif" : "Inactif"}
          </span>
        </div>
        {enabled ? (
          <p className="admin-trending-empty-hint">
            Ton compte{me ? (me.twoFactorEnabled ? " est protégé." : " sera protégé dès ta prochaine connexion.") : "."}{" "}
            <Link href="/dashboard/security" className="admin-inline-link">
              Lier mon application d’authentification
            </Link>
          </p>
        ) : (
          <p className="admin-bypass-warning">
            <Icon i="triangle-alert" size={14} />
            Le double facteur est désactivé sur ce déploiement. Pour l’activer, définis la variable d’environnement{" "}
            <strong>OWNER_2FA_ENABLED=true</strong> (Vercel → Settings → Environment Variables) puis redéploie.
          </p>
        )}
      </section>

      <section className="admin-panel admin-table-panel">
        <div className="admin-section-heading">
          <div>
            <h2>Comptes propriétaires</h2>
            <p>État du double facteur de chaque compte d’administration.</p>
          </div>
        </div>
        <div className="admin-data-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Compte</th>
                <th>Rôle</th>
                <th>Double facteur</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <div className="admin-table-user">
                      <span className="admin-table-avatar" aria-hidden="true">
                        {getNameInitials(entry.name)}
                      </span>
                      <span>
                        <strong>{entry.name}</strong>
                        <small>{entry.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    {(entry.role ?? "")
                      .split(",")
                      .map((role) => roleLabels.get(role.trim()) ?? role.trim())
                      .join(", ")}
                  </td>
                  <td>
                    <span className={`admin-status ${entry.twoFactorEnabled ? "is-success" : "is-pending"}`}>
                      {entry.twoFactorEnabled ? "Activé" : enabled ? "À la prochaine connexion" : "Non"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminPage>
  );
}
