import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="admin-dashboard" aria-busy="true" aria-label="Chargement du tableau de bord propriétaire">
      <div className="admin-page-header admin-loading-header">
        <div>
          <Skeleton width="9rem" height="0.75rem" />
          <Skeleton width="15rem" height="2.5rem" />
          <Skeleton width="min(32rem, 78vw)" height="1rem" />
        </div>
      </div>
      <div className="admin-kpi-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="admin-stat-card" key={index}>
            <Skeleton width="2.6rem" height="2.6rem" />
            <Skeleton width="55%" height="1.8rem" />
            <Skeleton width="72%" height="0.9rem" />
            <Skeleton width="88%" height="0.7rem" />
          </div>
        ))}
      </div>
      <div className="admin-insight-grid">
        {Array.from({ length: 2 }, (_, index) => (
          <div className="admin-panel admin-loading-panel" key={index}>
            <Skeleton width="60%" height="1.3rem" />
            <Skeleton width="100%" height="10rem" />
          </div>
        ))}
      </div>
      <span className="sr-only">Chargement…</span>
    </main>
  );
}
