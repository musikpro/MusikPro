import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/permissions";
import { resolveExtraAdminSlugs } from "@/lib/auth/custom-roles";
import { ownerTwoFactorEnabled } from "@/lib/auth/owner-two-factor";
import { hasVerifiedTotp } from "@/lib/auth/totp-status";

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
  if (!isAdminRole(role, await resolveExtraAdminSlugs(role))) redirect("/dashboard");
  // OWNER_2FA_ENABLED est l'interrupteur : une fois actif, un propriétaire doit avoir lié une application
  // d'authentification. À la première connexion (code e-mail) il est conduit à l'enregistrer avant d'administrer.
  if (ownerTwoFactorEnabled() && !(await hasVerifiedTotp(session.user.id))) {
    redirect("/dashboard/security?required=admin-2fa");
  }
  return session;
}
