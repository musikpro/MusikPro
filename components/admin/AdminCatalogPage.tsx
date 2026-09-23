"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Icon from "@/components/banani/Icon";
import { AdminPage, AdminPageHeader, AdminSourceNotice } from "./AdminPage";

export type AdminCatalogItem = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  status: "active" | "inactive" | "coming" | "beta";
  icon?: string;
  accent?: string;
  href?: string;
};

const statusLabels = {
  active: "Actif",
  inactive: "Inactif",
  coming: "À venir",
  beta: "Bêta",
};

export default function AdminCatalogPage({
  eyebrow,
  title,
  description,
  searchLabel,
  items,
  action,
  sourceNote,
  banner,
  emptyTitle = "Aucun résultat",
  emptyDescription = "Modifie la recherche ou le statut sélectionné.",
}: {
  eyebrow: string;
  title: string;
  description: string;
  searchLabel: string;
  items: AdminCatalogItem[];
  action?: { href: string; label: string };
  sourceNote?: string;
  banner?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | AdminCatalogItem["status"]>("all");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return items.filter(
      (item) =>
        (status === "all" || item.status === status) &&
        (!normalized ||
          `${item.title} ${item.subtitle} ${item.meta ?? ""}`.toLocaleLowerCase("fr").includes(normalized)),
    );
  }, [items, query, status]);

  return (
    <AdminPage>
      <AdminPageHeader eyebrow={eyebrow} title={title} description={description} action={action} />
      {banner}
      {sourceNote ? <AdminSourceNotice>{sourceNote}</AdminSourceNotice> : null}
      <section className="admin-catalog-toolbar" aria-label={`Filtres ${title}`}>
        <label className="admin-search-field">
          <Icon i="search" size={17} />
          <span className="sr-only">{searchLabel}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchLabel} />
          {query ? (
            <button type="button" aria-label="Effacer la recherche" onClick={() => setQuery("")}>
              <Icon i="x" size={15} />
            </button>
          ) : null}
        </label>
        <div className="admin-filter-tabs" aria-label="Filtrer par statut">
          {(["all", "active", "inactive", "coming", "beta"] as const).map((value) => (
            <button
              type="button"
              key={value}
              className={status === value ? "is-active" : undefined}
              onClick={() => setStatus(value)}
            >
              {value === "all" ? "Tous" : statusLabels[value]}
            </button>
          ))}
        </div>
      </section>
      <p className="admin-result-count">
        {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
      </p>
      {filtered.length ? (
        <section className="admin-catalog-grid">
          {filtered.map((item) => (
            <article className="admin-catalog-card" key={item.id}>
              {item.href ? (
                <Link className="admin-catalog-card-hit" href={item.href} aria-label={`Ouvrir ${item.title}`}>
                  <span className="sr-only">Ouvrir {item.title}</span>
                </Link>
              ) : null}
              <div className="admin-catalog-card-head">
                <span className="admin-catalog-icon" style={item.accent ? { color: item.accent } : undefined}>
                  <Icon i={item.icon ?? "music-2"} size={21} />
                </span>
                <span className={`admin-status is-${item.status === "active" ? "success" : "pending"}`}>
                  {statusLabels[item.status]}
                </span>
              </div>
              <h2>{item.title}</h2>
              <p>{item.subtitle}</p>
              <footer>
                <span>{item.meta ?? "Configuration à connecter"}</span>
                {item.href ? (
                  <span className="admin-catalog-open" aria-hidden="true">
                    <Icon i="arrow-up-right" size={17} />
                  </span>
                ) : (
                  <span className="admin-catalog-locked" title="Source métier à connecter">
                    <Icon i="lock-keyhole" size={15} />
                  </span>
                )}
              </footer>
            </article>
          ))}
        </section>
      ) : (
        <div className="admin-empty-state admin-catalog-empty">
          <Icon i="search-x" size={24} />
          <strong>{emptyTitle}</strong>
          <p>{emptyDescription}</p>
        </div>
      )}
    </AdminPage>
  );
}
