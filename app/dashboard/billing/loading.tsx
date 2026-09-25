import { Skeleton, SkeletonCards, SkeletonTable } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <main className="shell skeleton-page" aria-busy="true" aria-label="Chargement de la facturation">
      <Skeleton className="skeleton-page-title" />
      <SkeletonCards count={3} />
      <Skeleton className="skeleton-section-title" />
      <SkeletonTable columns={4} rows={6} />
      <span className="sr-only">Chargement…</span>
    </main>
  );
}
