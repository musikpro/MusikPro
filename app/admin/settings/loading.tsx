import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="admin-dashboard admin-module-page" aria-busy="true" aria-label="Chargement des paramètres">
      <header className="admin-page-header">
        <div>
          <Skeleton width="10rem" height="0.75rem" />
          <Skeleton width="16rem" height="2.5rem" />
          <Skeleton width="min(34rem, 78vw)" height="1rem" />
        </div>
      </header>
      <div className="admin-settings-grid">
        <div className="admin-panel">
          <Skeleton width="3rem" height="3rem" />
          <Skeleton width="60%" height="1.4rem" />
          <Skeleton width="100%" height="2.5rem" />
          <Skeleton width="40%" height="2.5rem" />
        </div>
      </div>
      <span className="sr-only">Chargement…</span>
    </main>
  );
}
