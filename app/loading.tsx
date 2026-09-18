import { Skeleton, SkeletonCards } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <main className="shell skeleton-page" aria-busy="true" aria-label="Chargement">
      <Skeleton className="skeleton-page-title" />
      <Skeleton style={{ width: "min(38rem, 92vw)", height: "1rem", marginBottom: ".75rem" }} />
      <Skeleton style={{ width: "min(30rem, 78vw)", height: "1rem", marginBottom: "2rem" }} />
      <SkeletonCards count={3} />
      <span className="sr-only">Chargement…</span>
    </main>
  );
}
