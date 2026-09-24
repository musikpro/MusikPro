import { AuthForm } from "@/components/auth-form";

// Forced dynamic: the CSP nonce (lib/security/headers.ts, set per request in proxy.ts) only
// exists at request time, so a statically prerendered page would ship without one and Next's
// own hydration scripts would be blocked by script-src.
export const dynamic = "force-dynamic";

export default function Page() {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return <AuthForm mode="register" googleEnabled={googleEnabled} />;
}
