import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="admin-dashboard admin-module-page" aria-busy="true" aria-label="Chargement des fournisseurs IA">
      <header className="admin-page-header">
        <div>
          <Skeleton width="10rem" height="0.75rem" />
          <Skeleton width="18rem" height="2.5rem" />
          <Skeleton width="min(34rem, 78vw)" height="1rem" />
        </div>
      </header>
      <section className="admin-catalog-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="admin-catalog-card" key={index}>
            <Skeleton width="3rem" height="3rem" />
            <Skeleton width="70%" height="1.4rem" />
            <Skeleton width="90%" height="2.5rem" />
            <Skeleton width="100%" height="0.8rem" />
          </div>
        ))}
      </section>
      <span className="sr-only">Chargement…</span>
    </main>
  );
}
