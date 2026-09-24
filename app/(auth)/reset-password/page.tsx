import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Skeleton } from "@/components/ui/skeleton";

// Forced dynamic: the CSP nonce (lib/security/headers.ts, set per request in proxy.ts) only
// exists at request time, so a statically prerendered page would ship without one and Next's
// own hydration scripts would be blocked by script-src.
export const dynamic = "force-dynamic";

function ResetPasswordSkeleton() {
  return (
    <main className="auth-page auth-reset-skeleton" aria-busy="true" aria-label="Chargement du formulaire">
      <div className="auth-panel">
        <Skeleton width="142px" height="42px" />
        <div className="auth-form" aria-hidden="true">
          <Skeleton width="80px" height="80px" style={{ margin: "0 auto 24px", borderRadius: "999px" }} />
          <Skeleton width="72%" height="30px" style={{ marginBottom: "10px" }} />
          <Skeleton width="100%" height="18px" style={{ marginBottom: "28px" }} />
          <Skeleton width="100%" height="50px" style={{ marginBottom: "18px" }} />
          <Skeleton width="100%" height="52px" />
        </div>
        <span className="sr-only">Chargement…</span>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
