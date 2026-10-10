"use client";

import Icon from "@/components/banani/Icon";

/** Barre d'outils commune des listes du tableau de bord (Utilisateurs, Générations) : recherche + filtre par état. */
export default function AdminTableToolbar<T extends string>({
  query,
  onQueryChange,
  searchLabel,
  placeholder,
  filters,
  activeFilter,
  onFilterChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  searchLabel: string;
  placeholder: string;
  filters: readonly (readonly [T, string])[];
  activeFilter: T;
  onFilterChange: (value: T) => void;
}) {
  return (
    <div className="admin-catalog-toolbar admin-table-toolbar">
      <label className="admin-search-field">
        <Icon i="search" size={17} />
        <span className="sr-only">{searchLabel}</span>
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} />
        {query ? (
          <button type="button" aria-label="Effacer la recherche" onClick={() => onQueryChange("")}>
            <Icon i="x" size={15} />
          </button>
        ) : null}
      </label>
      <div className="admin-filter-tabs">
        {filters.map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={activeFilter === value ? "is-active" : undefined}
            onClick={() => onFilterChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
