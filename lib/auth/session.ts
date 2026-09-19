import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasAppRole } from "@/lib/auth/permissions";
import { getSecurityLevel, securityPolicy } from "@/lib/security/config";
import { ownerTwoFactorEnabled } from "@/lib/auth/owner-two-factor";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function isDemoRequest() {
  return (await headers()).get("x-musikpro-demo-route") === "1";
}

function demoSession() {
  const now = new Date();
  return {
    user: {
      id: "musikpro-public-demo",
      name: "Visiteur MusikPro",
      email: "demo@musikpro.net",
      emailVerified: true,
      image: null,
      role: "user",
      twoFactorEnabled: false,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: "musikpro-public-demo-session",
      userId: "musikpro-public-demo",
      token: "public-demo-no-auth-token",
      expiresAt: now,
      createdAt: now,
      updatedAt: now,
      ipAddress: null,
      userAgent: null,
    },
  };
}

export async function requireUser() {
  if (await isDemoRequest()) return demoSession();
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
  if (ownerTwoFactorEnabled() && policy.requireAdmin2FA && !twoFactorEnabled) {
    redirect("/dashboard/security?required=admin-2fa");
  }
  return session;
}
