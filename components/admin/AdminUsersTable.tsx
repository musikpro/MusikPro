"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/banani/Icon";
import { deleteUser, setRole } from "@/app/admin/users/actions";
import { getNameInitials } from "@/lib/profile/name-initials";
import { ADMIN_ROLES, ADMIN_ROLE_META } from "@/lib/auth/permissions";
import AdminActionForm from "./AdminActionForm";
import AdminDeleteUserButton from "./AdminDeleteUserButton";
import AdminSelect from "./AdminSelect";

const roleOptions = [
  { value: "user", label: "Utilisateur" },
  ...ADMIN_ROLES.map((role) => ({ value: role, label: ADMIN_ROLE_META[role].label })),
];

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  verified: boolean;
  twoFactor: boolean;
  role: string;
  banned: boolean;
};

export default function AdminUsersTable({
  rows,
  twoFactorAvailable,
}: {
  rows: AdminUserRow[];
  twoFactorAvailable: boolean;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"all" | "active" | "inactive">("all");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return rows.filter(
      (row) =>
        (state === "all" || (state === "active" ? !row.banned : row.banned)) &&
        (!needle || `${row.name} ${row.email} ${row.role}`.toLocaleLowerCase("fr").includes(needle)),
    );
  }, [query, rows, state]);
  return (
    <section className="admin-panel admin-table-panel admin-users-panel">
      <div className="admin-catalog-toolbar admin-table-toolbar">
        <label className="admin-search-field">
          <Icon i="search" size={17} />
          <span className="sr-only">Rechercher un utilisateur</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, e-mail ou rôle…" />
          {query ? (
            <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery("")}>
              <Icon i="x" size={15} />
            </button>
          ) : null}
        </label>
        <div className="admin-filter-tabs">
          {(["all", "active", "inactive"] as const).map((value) => (
            <button
              type="button"
              key={value}
              className={state === value ? "is-active" : undefined}
              onClick={() => setState(value)}
            >
              {value === "all" ? "Tous" : value === "active" ? "Actifs" : "Suspendus"}
            </button>
          ))}
        </div>
      </div>
      <div className="admin-data-table-wrap">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Inscription</th>
              <th>Vérification</th>
              <th>2FA</th>
              <th>Rôle</th>
              <th>État</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="admin-table-primary">
                  <div className="admin-table-user">
                    <span className="admin-table-avatar" aria-hidden="true">
                      {getNameInitials(row.name)}
                    </span>
                    <span>
                      <strong>{row.name}</strong>
                      <small>{row.email}</small>
                    </span>
                  </div>
                </td>
                <td>{new Date(row.createdAt).toLocaleDateString("fr-FR")}</td>
                <td>
                  <span className={`admin-status ${row.verified ? "is-success" : "is-pending"}`}>
                    {row.verified ? "Vérifié" : "À vérifier"}
                  </span>
                </td>
                <td>{twoFactorAvailable ? (row.twoFactor ? "Activée" : "Non") : "Suspendue"}</td>
                <td>{row.role}</td>
                <td>
                  <span className={`admin-status ${row.banned ? "is-danger" : "is-success"}`}>
                    {row.banned ? "Suspendu" : "Actif"}
                  </span>
                </td>
                <td>
                  <div className="admin-table-actions">
                    <AdminActionForm action={setRole} className="admin-inline-form">
                      <input type="hidden" name="userId" value={row.id} />
                      <AdminSelect
                        name="role"
                        defaultValue={row.role}
                        options={roleOptions}
                        ariaLabel={`Rôle de ${row.name}`}
                      />
                      <button type="submit" aria-label={`Enregistrer le rôle de ${row.name}`}>
                        <Icon i="check" size={17} />
                        <span>Valider</span>
                      </button>
                    </AdminActionForm>
                    <AdminActionForm action={deleteUser}>
                      <input type="hidden" name="userId" value={row.id} />
                      <AdminDeleteUserButton email={row.email} />
                    </AdminActionForm>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="admin-users-mobile-list">
        {filtered.map((row) => (
          <article className="admin-user-mobile-card" key={row.id}>
            <header>
              <span className="admin-table-avatar" aria-hidden="true">
                {getNameInitials(row.name)}
              </span>
              <div>
                <strong>{row.name}</strong>
                <small>{row.email}</small>
              </div>
              <span className={`admin-status ${row.banned ? "is-danger" : "is-success"}`}>
                {row.banned ? "Suspendu" : "Actif"}
              </span>
            </header>
            <dl>
              <div>
                <dt>Inscription</dt>
                <dd>{new Date(row.createdAt).toLocaleDateString("fr-FR")}</dd>
              </div>
              <div>
                <dt>Vérification</dt>
                <dd>{row.verified ? "Vérifié" : "À vérifier"}</dd>
              </div>
              <div>
                <dt>2FA</dt>
                <dd>{twoFactorAvailable ? (row.twoFactor ? "Activée" : "Non") : "Suspendue"}</dd>
              </div>
            </dl>
            <div className="admin-table-actions">
              <AdminActionForm action={setRole} className="admin-inline-form">
                <input type="hidden" name="userId" value={row.id} />
                <AdminSelect
                  name="role"
                  defaultValue={row.role}
                  options={roleOptions}
                  ariaLabel={`Rôle de ${row.name}`}
                />
                <button type="submit" aria-label={`Enregistrer le rôle de ${row.name}`}>
                  <Icon i="check" size={17} />
                  <span>Valider</span>
                </button>
              </AdminActionForm>
              <AdminActionForm action={deleteUser}>
                <input type="hidden" name="userId" value={row.id} />
                <AdminDeleteUserButton email={row.email} />
              </AdminActionForm>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length ? (
        <div className="admin-empty-state">
          <Icon i="search-x" size={22} />
          <strong>Aucun utilisateur trouvé</strong>
          <p>Modifie la recherche ou le filtre.</p>
        </div>
      ) : null}
    </section>
  );
}
