"use client";

import { useMemo, useState } from "react";
import Icon from "@/components/banani/Icon";
import { setRole } from "@/app/admin/users/actions";

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

export default function AdminUsersTable({ rows }: { rows: AdminUserRow[] }) {
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
    <section className="admin-panel admin-table-panel">
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
                  <strong>{row.name}</strong>
                  <small>{row.email}</small>
                </td>
                <td>{new Date(row.createdAt).toLocaleDateString("fr-FR")}</td>
                <td>
                  <span className={`admin-status ${row.verified ? "is-success" : "is-pending"}`}>
                    {row.verified ? "Vérifié" : "À vérifier"}
                  </span>
                </td>
                <td>{row.twoFactor ? "Activée" : "Non"}</td>
                <td>{row.role}</td>
                <td>
                  <span className={`admin-status ${row.banned ? "is-danger" : "is-success"}`}>
                    {row.banned ? "Suspendu" : "Actif"}
                  </span>
                </td>
                <td>
                  <form action={setRole} className="admin-inline-form">
                    <input type="hidden" name="userId" value={row.id} />
                    <select name="role" defaultValue={row.role} aria-label={`Rôle de ${row.name}`}>
                      <option value="user">Utilisateur</option>
                      <option value="admin">Administrateur</option>
                    </select>
                    <button type="submit" aria-label={`Enregistrer le rôle de ${row.name}`}>
                      <Icon i="save" size={15} />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
