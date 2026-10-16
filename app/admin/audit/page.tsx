import Link from "next/link";
import { redirect } from "next/navigation";
import Icon from "@/components/banani/Icon";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AUDIT_EXPORT_LIMIT, listAuditActions, listAuditPage } from "@/lib/admin/audit";
import type { AuditRow } from "@/lib/admin/audit-types";
import { pageRange, pageWindow } from "@/lib/admin/pagination";
import { hasAppRole } from "@/lib/auth/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { auditFiltersToSearchParams, parseAuditFilters } from "@/lib/validation/audit-filters";

export const dynamic = "force-dynamic";

const METADATA_PREVIEW_LIMIT = 2000;

function formatMetadata(metadata: unknown): string | null {
  if (metadata === null || metadata === undefined) return null;
  if (typeof metadata === "object" && Object.keys(metadata as object).length === 0) return null;
  const text = JSON.stringify(metadata, null, 2);
  return text.length > METADATA_PREVIEW_LIMIT ? `${text.slice(0, METADATA_PREVIEW_LIMIT)}\n…` : text;
}

function actorLabel(row: AuditRow) {
  if (row.actorName || row.actorEmail) {
    return (
      <>
        <span>{row.actorName ?? row.actorEmail}</span>
        {row.actorName && row.actorEmail ? <small>{row.actorEmail}</small> : null}
      </>
    );
  }
  if (row.actorId) return <span>Compte supprimé · {row.actorId}</span>;
  return <span>Système</span>;
}

/**
 * Journal d’audit — lecture seule des entrées écrites par writeAuditLog (lib/security/audit.ts). Filtres en GET
 * (URL partageable), revalidés par Zod ; l'export CSV (/api/admin/audit/export) réutilise exactement les mêmes
 * filtres. Réservé au Super Admin : le journal contient des e-mails et des adresses IP.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdmin();
  if (!hasAppRole((session.user as { role?: string }).role, "admin")) redirect("/admin");

  const { filters, error } = parseAuditFilters(await searchParams);
  const [data, knownActions] = await Promise.all([listAuditPage(filters), listAuditActions()]);
  const actions =
    filters.action && !knownActions.includes(filters.action) ? [filters.action, ...knownActions] : knownActions;

  const hasFilters = Boolean(filters.actor || filters.action || filters.from || filters.to);
  const exportQuery = auditFiltersToSearchParams(filters).toString();
  const exportHref = `/api/admin/audit/export${exportQuery ? `?${exportQuery}` : ""}`;
  const pageHref = (page: number) => {
    const params = auditFiltersToSearchParams({ ...filters, page }, { withPage: true }).toString();
    return `/admin/audit${params ? `?${params}` : ""}`;
  };
  const { from, to } = pageRange(data.page, data.pageSize, data.total);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sécurité et conformité"
        title="Journal d’audit"
        description="Qui a fait quoi dans le tableau de bord, du plus récent au plus ancien. Les heures sont en UTC."
      />
      <section className="admin-metric-row admin-metrics-compact">
        <AdminMetric
          icon="scroll-text"
          value={data.total.toLocaleString("fr-FR")}
          label={hasFilters ? "Entrées correspondantes" : "Entrées au journal"}
          note={hasFilters ? "Avec les filtres actifs" : "Depuis le début"}
        />
      </section>

      <section className="admin-panel admin-table-panel admin-audit-panel">
        <form
          method="get"
          action="/admin/audit"
          className="admin-audit-filters"
          role="search"
          aria-label="Filtrer le journal d'audit"
        >
          <label className="admin-audit-field">
            <span>Acteur</span>
            <input
              type="search"
              name="actor"
              defaultValue={filters.actor ?? ""}
              maxLength={120}
              placeholder="Nom, e-mail ou identifiant"
            />
          </label>
          <label className="admin-audit-field">
            <span>Action</span>
            <select name="action" defaultValue={filters.action ?? ""}>
              <option value="">Toutes les actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-audit-field">
            <span>Du</span>
            <input type="date" name="from" defaultValue={filters.from ?? ""} />
          </label>
          <label className="admin-audit-field">
            <span>Au</span>
            <input type="date" name="to" defaultValue={filters.to ?? ""} />
          </label>
          <div className="admin-audit-actions">
            <button type="submit" className="admin-primary-action">
              <Icon i="search" size={16} />
              Filtrer
            </button>
            {hasFilters ? (
              <Link href="/admin/audit" className="admin-secondary-action">
                <Icon i="rotate-ccw" size={16} />
                Réinitialiser
              </Link>
            ) : null}
            <a href={exportHref} className="admin-secondary-action" download>
              <Icon i="download" size={16} />
              Exporter en CSV
            </a>
          </div>
        </form>
        <p className="admin-audit-hint">
          L’export suit les filtres ci-dessus et contient au plus les {AUDIT_EXPORT_LIMIT.toLocaleString("fr-FR")}{" "}
          entrées les plus récentes. Chaque export est lui-même enregistré dans le journal.
        </p>
        {error ? (
          <p className="admin-audit-error" role="alert">
            {error} Les filtres ont été réinitialisés.
          </p>
        ) : null}

        <div className="admin-data-table-wrap">
          <table className="admin-data-table admin-row-table admin-audit-table">
            <caption className="sr-only">Entrées du journal d’audit</caption>
            <thead>
              <tr>
                <th>Date (UTC)</th>
                <th>Acteur</th>
                <th>Action</th>
                <th>Cible</th>
                <th>Adresse IP</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-audit-empty">
                    {hasFilters ? "Aucune entrée ne correspond à ces filtres." : "Le journal est vide pour le moment."}
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => {
                  const details = formatMetadata(row.metadata);
                  return (
                    <tr key={row.id}>
                      <td data-label="Date (UTC)" className="admin-audit-date">
                        <span>{row.createdAt.slice(0, 10)}</span>
                        <small>{row.createdAt.slice(11, 19)}</small>
                      </td>
                      <td data-label="Acteur" className="admin-audit-actor">
                        {actorLabel(row)}
                      </td>
                      <td data-label="Action">
                        <code>{row.action}</code>
                      </td>
                      <td data-label="Cible">
                        {row.targetType || row.targetId ? (
                          <>
                            <span>{row.targetType ?? "—"}</span>
                            {row.targetId ? <small>{row.targetId}</small> : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Adresse IP">{row.ip ?? "—"}</td>
                      <td data-label="Détails">
                        {details ? (
                          <details className="admin-audit-details">
                            <summary>Voir</summary>
                            <pre>{details}</pre>
                          </details>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <nav className="admin-pagination" aria-label="Pagination du journal d'audit">
          <p className="admin-pagination-summary" aria-live="polite">
            {data.total > 0 ? (
              <>
                <strong>
                  {from.toLocaleString("fr-FR")}–{to.toLocaleString("fr-FR")}
                </strong>{" "}
                sur {data.total.toLocaleString("fr-FR")} entrées
              </>
            ) : (
              "Aucun résultat"
            )}
          </p>
          {data.pageCount > 1 ? (
            <div className="admin-pagination-controls">
              {data.page > 1 ? (
                <Link
                  href={pageHref(data.page - 1)}
                  className="admin-pagination-step"
                  aria-label="Page précédente"
                  rel="prev"
                >
                  <Icon i="chevron-left" size={16} />
                  <span>Précédent</span>
                </Link>
              ) : null}
              <span className="admin-pagination-compact">
                Page {data.page} sur {data.pageCount}
              </span>
              <ol className="admin-pagination-pages">
                {pageWindow(data.page, data.pageCount).map((item, index) =>
                  item === "gap" ? (
                    <li key={`gap-${index}`} className="admin-pagination-gap" aria-hidden="true">
                      …
                    </li>
                  ) : (
                    <li key={item}>
                      <Link
                        href={pageHref(item)}
                        className={item === data.page ? "is-current" : undefined}
                        aria-current={item === data.page ? "page" : undefined}
                        aria-label={`Page ${item}`}
                      >
                        {item}
                      </Link>
                    </li>
                  ),
                )}
              </ol>
              {data.page < data.pageCount ? (
                <Link
                  href={pageHref(data.page + 1)}
                  className="admin-pagination-step"
                  aria-label="Page suivante"
                  rel="next"
                >
                  <span>Suivant</span>
                  <Icon i="chevron-right" size={16} />
                </Link>
              ) : null}
            </div>
          ) : null}
        </nav>
      </section>
    </AdminPage>
  );
}
