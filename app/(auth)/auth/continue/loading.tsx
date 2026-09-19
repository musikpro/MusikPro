import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="auth-page" aria-busy="true" aria-label="Ouverture de votre espace">
      <section className="auth-panel">
        <div className="auth-stage">
          <Skeleton width="4rem" height="4rem" style={{ marginInline: "auto" }} />
          <Skeleton width="70%" height="2rem" style={{ marginInline: "auto" }} />
          <Skeleton width="88%" height="1rem" style={{ marginInline: "auto" }} />
        </div>
        <span className="sr-only">Ouverture de votre tableau de bord…</span>
      </section>
    </main>
  );
}
