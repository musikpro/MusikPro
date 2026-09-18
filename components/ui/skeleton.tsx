import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  width?: string;
  height?: string;
};

export function Skeleton({ className = "", width, height, style, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className}`.trim()}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-stack" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className="skeleton-line" style={{ width: index === lines - 1 ? "68%" : "100%" }} />
      ))}
    </div>
  );
}

export function SkeletonKpiGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid skeleton-kpi-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="card skeleton-card" key={index}>
          <Skeleton className="skeleton-label" />
          <Skeleton className="skeleton-value" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="card skeleton-card" key={index}>
          <Skeleton className="skeleton-heading" />
          <SkeletonText lines={2} />
          <Skeleton className="skeleton-button" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="table-wrap skeleton-table-wrap" aria-hidden="true">
      <table className="table skeleton-table">
        <thead>
          <tr>{Array.from({ length: columns }, (_, i) => <th key={i}><Skeleton className="skeleton-table-head" /></th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {Array.from({ length: columns }, (_, column) => (
                <td key={column}><Skeleton className="skeleton-table-cell" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardSkeleton({ admin = false }: { admin?: boolean }) {
  return (
    <main className="shell skeleton-page" aria-busy="true" aria-label="Chargement de la page">
      <div className="skeleton-nav" aria-hidden="true">
        {Array.from({ length: admin ? 6 : 4 }, (_, i) => <Skeleton key={i} className="skeleton-nav-item" />)}
      </div>
      <Skeleton className="skeleton-page-title" />
      <SkeletonKpiGrid count={admin ? 4 : 3} />
      <Skeleton className="skeleton-section-title" />
      <SkeletonCards count={2} />
      <span className="sr-only">Chargement…</span>
    </main>
  );
}

export function AdminTableSkeleton({ columns = 5, rows = 7, withForm = false }: { columns?: number; rows?: number; withForm?: boolean }) {
  return (
    <main className="shell skeleton-page" aria-busy="true" aria-label="Chargement de la page d’administration">
      <Skeleton className="skeleton-page-title" />
      {withForm ? (
        <div className="card skeleton-form-card" aria-hidden="true">
          <div className="grid">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="skeleton-field" />)}
          </div>
          <Skeleton className="skeleton-button" />
        </div>
      ) : null}
      <Skeleton className="skeleton-section-title" />
      <SkeletonTable columns={columns} rows={rows} />
      <span className="sr-only">Chargement…</span>
    </main>
  );
}
