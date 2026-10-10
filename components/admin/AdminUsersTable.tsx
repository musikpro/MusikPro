"use client";

import { useMemo, useRef, useState } from "react";
import Icon from "@/components/banani/Icon";
import { deleteUser, setRole } from "@/app/admin/users/actions";
import { getNameInitials } from "@/lib/profile/name-initials";
import { clampPage, pageCount } from "@/lib/admin/pagination";
import AdminActionForm from "./AdminActionForm";
import AdminPagination from "./AdminPagination";
import AdminDeleteUserButton from "./AdminDeleteUserButton";
import AdminSelect from "./AdminSelect";

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
  roleOptions,
  twoFactorAvailable,
  pageSize,
}: {
  rows: AdminUserRow[];
  roleOptions: { value: string; label: string }[];
  twoFactorAvailable: boolean;
  pageSize: number;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const roleLabelByValue = useMemo(
    () => new Map(roleOptions.map((option) => [option.value, option.label])),
    [roleOptions],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return rows.filter(
      (row) =>
        (state === "all" || (state === "active" ? !row.banned : row.banned)) &&
        (!needle || `${row.name} ${row.email} ${row.role}`.toLocaleLowerCase("fr").includes(needle)),
    );
  }, [query, rows, state]);

  // Un nouveau filtre ou une nouvelle recherche ramène à la page 1.
  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const updateState = (value: "all" | "active" | "inactive") => {
    setState(value);
    setPage(1);
  };

  const currentPage = clampPage(page, filtered.length, pageSize);
  const visible = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );
  const goToPage = (target: number) => {
    setPage(target);
    setExpandedId(null);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panelRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };
  return (
    <section ref={panelRef} className="admin-panel admin-table-panel admin-users-panel">
      <div className="admin-catalog-toolbar admin-table-toolbar">
        <label className="admin-search-field">
          <Icon i="search" size={17} />
          <span className="sr-only">Rechercher un utilisateur</span>
          <input
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Nom, e-mail ou rôle…"
          />
          {query ? (
            <button type="button" aria-label="Effacer la recherche" onClick={() => updateQuery("")}>
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
              onClick={() => updateState(value)}
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
            {visible.map((row) => (
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
                <td>{roleLabelByValue.get(row.role) ?? row.role}</td>
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
        {visible.map((row) => {
          const expanded = expandedId === row.id;
          const detailsId = `admin-user-details-${row.id}`;
          return (
            <article className="admin-user-mobile-card" data-expanded={expanded} key={row.id}>
              <button
                type="button"
                className="admin-user-mobile-summary"
                aria-expanded={expanded}
                aria-controls={detailsId}
                aria-label={`${expanded ? "Replier" : "Déplier"} les détails de ${row.name}`}
                onClick={() => setExpandedId(expanded ? null : row.id)}
              >
                <span className="admin-table-avatar" aria-hidden="true">
                  {getNameInitials(row.name)}
                </span>
                <span className="admin-user-mobile-identity">
                  <strong>{row.name}</strong>
                  <small>{row.email}</small>
                </span>
                <span className={`admin-status ${row.banned ? "is-danger" : "is-success"}`}>
                  {row.banned ? "Suspendu" : "Actif"}
                </span>
                <span className="admin-user-mobile-chevron" aria-hidden="true">
                  <Icon i="chevron-down" size={18} />
                </span>
              </button>
              <div className="admin-user-mobile-details" id={detailsId} hidden={!expanded}>
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
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length ? (
        <div className="admin-empty-state">
          <Icon i="search-x" size={22} />
          <strong>Aucun utilisateur trouvé</strong>
          <p>Modifie la recherche ou le filtre.</p>
        </div>
      ) : null}
      <AdminPagination
        page={currentPage}
        pageCount={pageCount(filtered.length, pageSize)}
        pageSize={pageSize}
        total={filtered.length}
        itemLabel="comptes"
        onPageChange={goToPage}
      />
    </section>
  );
}
