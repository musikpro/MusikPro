"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Icon from "@/components/banani/Icon";
import { deleteUser, fetchUsersPage, setRole } from "@/app/admin/users/actions";
import { getNameInitials } from "@/lib/profile/name-initials";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import type { AdminUserRow, UserStateFilter, UsersPage } from "@/lib/admin/users-types";
import AdminActionForm from "./AdminActionForm";
import AdminPagination from "./AdminPagination";
import AdminRowToggle from "./AdminRowToggle";
import AdminTableToolbar from "./AdminTableToolbar";
import AdminDeleteUserButton from "./AdminDeleteUserButton";
import AdminSelect from "./AdminSelect";

export type { AdminUserRow };

const SEARCH_DEBOUNCE_MS = 300;

const STATE_FILTERS = [
  ["all", "Tous"],
  ["active", "Actifs"],
  ["inactive", "Suspendus"],
] as const;

export default function AdminUsersTable({
  initial,
  roleOptions,
  twoFactorAvailable,
}: {
  initial: UsersPage;
  roleOptions: { value: string; label: string }[];
  twoFactorAvailable: boolean;
}) {
  const [data, setData] = useState<UsersPage>(initial);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [state, setState] = useState<UserStateFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, startTransition] = useTransition();
  const panelRef = useRef<HTMLElement | null>(null);
  const requestId = useRef(0);
  const showToast = useAdminToast();
  const roleLabelByValue = useMemo(
    () => new Map(roleOptions.map((option) => [option.value, option.label])),
    [roleOptions],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  /** Charge une page sans recharger l'écran ; seule la réponse la plus récente est appliquée. */
  const load = useCallback(
    (page: number, filters: { state: UserStateFilter; query: string }, scrollToTop: boolean) => {
      const current = ++requestId.current;
      startTransition(async () => {
        const result = await fetchUsersPage({ page, state: filters.state, query: filters.query });
        if (current !== requestId.current) return;
        if (!result.ok) {
          setLoadError(result.message);
          showToast({ message: result.message, tone: "error" });
          return;
        }
        setLoadError(null);
        setExpandedId(null);
        setData(result.data);
        if (scrollToTop) {
          const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          panelRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
      });
    },
    [showToast],
  );

  // Changement de filtre ou de recherche : retour à la page 1 (sans défiler, on est déjà sur la barre d'outils).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    load(1, { state, query: debouncedQuery }, false);
  }, [state, debouncedQuery, load]);

  const reloadCurrentPage = () => load(data.page, { state, query: debouncedQuery }, false);
  const rows = data.rows;
  return (
    <section ref={panelRef} className="admin-panel admin-table-panel admin-users-panel" aria-busy={isLoading}>
      <AdminTableToolbar
        query={query}
        onQueryChange={setQuery}
        searchLabel="Rechercher un utilisateur"
        placeholder="Nom, e-mail ou rôle…"
        filters={STATE_FILTERS}
        activeFilter={state}
        onFilterChange={setState}
      />
      <div className={`admin-data-table-wrap${isLoading ? " is-loading" : ""}`}>
        <table className="admin-data-table admin-row-table admin-users-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>État</th>
              <th>
                <span className="sr-only">Détails</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const expanded = expandedId === row.id;
              return (
                <tr key={row.id} data-status={row.banned ? "banned" : "active"} data-expanded={expanded}>
                  <td className="admin-table-primary" data-cell="identity">
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
                  <td data-cell="state">
                    <span className={`admin-status ${row.banned ? "is-danger" : "is-success"}`}>
                      {row.banned ? "Suspendu" : "Actif"}
                    </span>
                  </td>
                  <td className="admin-row-toggle-cell">
                    <AdminRowToggle
                      expanded={expanded}
                      label={row.name}
                      onToggle={() => setExpandedId(expanded ? null : row.id)}
                    />
                  </td>
                  <td data-detail="Inscription" data-cell="created">
                    {new Date(row.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td data-detail="Vérification" data-cell="verified">
                    <span className={`admin-status ${row.verified ? "is-success" : "is-pending"}`}>
                      {row.verified ? "Vérifié" : "À vérifier"}
                    </span>
                  </td>
                  <td data-detail="2FA" data-cell="twofactor">
                    {twoFactorAvailable ? (row.twoFactor ? "Activée" : "Non") : "Suspendue"}
                  </td>
                  <td data-detail="Rôle" data-cell="role">
                    {roleLabelByValue.get(row.role) ?? row.role}
                  </td>
                  <td data-detail="Modifier le rôle" data-cell="actions">
                    <div className="admin-table-actions">
                      <AdminActionForm action={setRole} className="admin-inline-form" onSuccess={reloadCurrentPage}>
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
                      <AdminActionForm action={deleteUser} onSuccess={reloadCurrentPage}>
                        <input type="hidden" name="userId" value={row.id} />
                        <AdminDeleteUserButton email={row.email} />
                      </AdminActionForm>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!rows.length ? (
        <div className="admin-empty-state">
          <Icon i="search-x" size={22} />
          <strong>Aucun utilisateur trouvé</strong>
          <p>Modifie la recherche ou le filtre.</p>
        </div>
      ) : null}
      {loadError ? (
        <p className="admin-generations-error" role="alert">
          {loadError}
        </p>
      ) : null}
      <AdminPagination
        page={data.page}
        pageCount={data.pageCount}
        pageSize={data.pageSize}
        total={data.total}
        itemLabel="comptes"
        disabled={isLoading}
        onPageChange={(page) => load(page, { state, query: debouncedQuery }, true)}
      />
    </section>
  );
}
