import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main
      className="shell skeleton-page"
      aria-busy="true"
      aria-label="Chargement de la sécurité"
    >
      <Skeleton className="skeleton-page-title" />
      <div className="card skeleton-card">
        <Skeleton className="skeleton-heading" />
        <SkeletonText lines={4} />
        <Skeleton className="skeleton-button" />
      </div>
      <span className="sr-only">Chargement…</span>
    </main>
  );
}
