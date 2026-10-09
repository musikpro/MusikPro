"use client";

import Icon from "@/components/banani/Icon";
import { pageRange, pageWindow } from "@/lib/admin/pagination";

type AdminPaginationProps = {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  /** Nom du contenu paginé, pour le résumé et les libellés d'accessibilité (ex. « générations »). */
  itemLabel: string;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

/** Pagination réutilisable du tableau de bord propriétaire : résumé, précédent/suivant et numéros avec ellipses. */
export default function AdminPagination({
  page,
  pageCount,
  pageSize,
  total,
  itemLabel,
  disabled = false,
  onPageChange,
}: AdminPaginationProps) {
  const { from, to } = pageRange(page, pageSize, total);
  const items = pageWindow(page, pageCount);
  const go = (target: number) => {
    if (disabled || target < 1 || target > pageCount || target === page) return;
    onPageChange(target);
  };

  return (
    <nav className="admin-pagination" aria-label={`Pagination des ${itemLabel}`}>
      <p className="admin-pagination-summary" aria-live="polite">
        {total > 0 ? (
          <>
            <strong>
              {from.toLocaleString("fr-FR")}–{to.toLocaleString("fr-FR")}
            </strong>{" "}
            sur {total.toLocaleString("fr-FR")} {itemLabel}
          </>
        ) : (
          `Aucun résultat`
        )}
      </p>
      {pageCount > 1 ? (
        <div className="admin-pagination-controls">
          <button
            type="button"
            className="admin-pagination-step"
            onClick={() => go(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Page précédente"
          >
            <Icon i="chevron-left" size={16} />
            <span>Précédent</span>
          </button>
          <span className="admin-pagination-compact" aria-hidden="true">
            Page {page} sur {pageCount}
          </span>
          <ol className="admin-pagination-pages">
            {items.map((item, index) =>
              item === "gap" ? (
                <li key={`gap-${index}`} className="admin-pagination-gap" aria-hidden="true">
                  …
                </li>
              ) : (
                <li key={item}>
                  <button
                    type="button"
                    className={item === page ? "is-current" : undefined}
                    onClick={() => go(item)}
                    disabled={disabled && item !== page}
                    aria-label={`Page ${item}`}
                    aria-current={item === page ? "page" : undefined}
                  >
                    {item}
                  </button>
                </li>
              ),
            )}
          </ol>
          <button
            type="button"
            className="admin-pagination-step"
            onClick={() => go(page + 1)}
            disabled={disabled || page >= pageCount}
            aria-label="Page suivante"
          >
            <span>Suivant</span>
            <Icon i="chevron-right" size={16} />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
