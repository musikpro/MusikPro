import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasAppRole } from "@/lib/auth/permissions";
import { getSecurityLevel, securityPolicy } from "@/lib/security/config";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  const role = (session.user as { role?: string }).role;
  if (!hasAppRole(role, "admin")) redirect("/dashboard");
  const twoFactorEnabled = Boolean((session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled);
  const policy = securityPolicy[getSecurityLevel()];
  if (policy.requireAdmin2FA && !twoFactorEnabled) redirect("/dashboard/security?required=admin-2fa");
  return session;
}
