import { desc } from "drizzle-orm";
import Icon from "@/components/banani/Icon";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { user } from "@/db/schema";
import { ADMIN_ROLE_META, ADMIN_ROLES, isAdminRole } from "@/lib/auth/permissions";
import { getActiveCustomRoleSlugs, listCustomRoles } from "@/lib/auth/custom-roles";
import { ownerTwoFactorEnabled } from "@/lib/auth/owner-two-factor";
import { requireAdmin } from "@/lib/auth/session";
import { hasVerifiedTotp } from "@/lib/auth/totp-status";
import { AdminTabPanel, AdminTabs } from "@/components/admin/AdminTabs";
import { TwoFactorSetup } from "@/components/two-factor-setup";
import { resolveAdminTab } from "@/lib/admin/tabs";
import { getNameInitials } from "@/lib/profile/name-initials";

export const dynamic = "force-dynamic";

/**
 * Sécurité — double facteur des propriétaires. Réservé aux comptes d'administration (Super Admin,
 * financier, support, rôles personnalisés…) ; les clients ne sont jamais concernés. Le
 * commutateur est la variable d'environnement OWNER_2FA_ENABLED (lib/auth/owner-two-factor.ts).
 */
export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
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
  const totpConfigured = enabled ? await hasVerifiedTotp(session.user.id) : false;
  const tabs = [
    { id: "mon-compte", label: "Mon double facteur" },
    { id: "comptes", label: "Comptes propriétaires" },
  ];
  const activeTab = resolveAdminTab((await searchParams).tab, tabs) ?? "mon-compte";

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

      <AdminTabs ariaLabel="Sections de Sécurité" tabs={tabs} defaultTab={activeTab} urlParam="tab">
        <AdminTabPanel id="mon-compte">
          <section className="admin-panel">
            <div className="admin-provider-heading">
              <span className="admin-catalog-icon">
                <Icon i="smartphone" size={20} />
              </span>
              <div>
                <h2>Mon double facteur</h2>
                <p>
                  Ton compte
                  {me ? (me.twoFactorEnabled ? " est protégé." : " sera protégé dès ta prochaine connexion.") : "."} Ici
                  tu relies une nouvelle application d’authentification (nouveau téléphone) et tu génères de nouveaux
                  codes de secours.
                </p>
              </div>
              <span className={`admin-status ${totpConfigured ? "is-success" : "is-pending"}`}>
                {totpConfigured ? "Application liée" : "À configurer"}
              </span>
            </div>
            {enabled ? (
              <TwoFactorSetup enabled={Boolean(me?.twoFactorEnabled)} totpConfigured={totpConfigured} />
            ) : null}
          </section>
          <section className="admin-panel">
            <div className="admin-provider-heading">
              <span className="admin-catalog-icon">
                <Icon i="key-round" size={20} />
              </span>
              <div>
                <h2>Comment ça fonctionne</h2>
                <p>
                  Le double facteur est obligatoire pour tous les propriétaires. À la première connexion, le code reçu
                  par e-mail ouvre l’accès, puis le propriétaire lie une application d’authentification (Google
                  Authenticator…) et conserve ses codes de secours. Ensuite, chaque connexion se valide au choix avec
                  l’application ou avec un code envoyé par e-mail. Aucun client n’est soumis à cette étape.
                </p>
              </div>
              <span className={`admin-status ${enabled ? "is-success" : "is-pending"}`}>
                {enabled ? "Actif" : "Inactif"}
              </span>
            </div>
            {!enabled && (
              <p className="admin-bypass-warning">
                <Icon i="triangle-alert" size={14} />
                Le double facteur est désactivé sur ce déploiement. Pour l’activer, définis la variable d’environnement{" "}
                <strong>OWNER_2FA_ENABLED=true</strong> (Vercel → Settings → Environment Variables) puis redéploie.
              </p>
            )}
          </section>
        </AdminTabPanel>
        <AdminTabPanel id="comptes">
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
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}
