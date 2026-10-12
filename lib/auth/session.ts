import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/permissions";
import { resolveExtraAdminSlugs } from "@/lib/auth/custom-roles";
import { ownerTwoFactorEnabled } from "@/lib/auth/owner-two-factor";
import { hasVerifiedTotp } from "@/lib/auth/totp-status";
import { GUEST_COOKIE, GUEST_HEADER, GUEST_USER_ID, isGuestAllowedPath, parseGuestCookie } from "@/lib/guest/access";
import { REQUEST_PATH_HEADER, splitLocalePrefix } from "@/lib/languages/locale-path";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function isDemoRequest() {
  return (await headers()).get("x-musikpro-demo-route") === "1";
}

/**
 * Visiteur invité (lien `/g/<slug>`). Deux cas, toujours limités à une route de la liste blanche :
 * - le proxy a posé l'en-tête interne (visiteur sans cookie de session, cookie invité valide) ;
 * - le visiteur a un cookie de session que le proxy ne peut pas juger (il voit seulement sa présence), mais la session
 *   est périmée ou invalide (ancien client qui clique sur une publicité) : il reste invité plutôt que d'être envoyé à
 *   la connexion. Un visiteur réellement connecté n'est jamais traité en invité.
 */
export async function isGuestRequest() {
  const requestHeaders = await headers();
  const requestedPath = (requestHeaders.get(REQUEST_PATH_HEADER) ?? "").split("?")[0];
  if (!isGuestAllowedPath(splitLocalePrefix(requestedPath).path)) return false;
  if (requestHeaders.get(GUEST_HEADER) === "1") return true;
  if (!parseGuestCookie((await cookies()).get(GUEST_COOKIE)?.value)) return false;
  return !(await getSession())?.user;
}

/** Session factice du visiteur invité : aucune ligne en base, aucun droit (rôle « user », jamais d'appel métier). */
function guestSession() {
  const now = new Date();
  return {
    user: {
      id: GUEST_USER_ID,
      name: "",
      email: "",
      emailVerified: false,
      image: null,
      role: "user",
      twoFactorEnabled: false,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: `${GUEST_USER_ID}-session`,
      userId: GUEST_USER_ID,
      token: "guest-visitor-no-auth-token",
      expiresAt: now,
      createdAt: now,
      updatedAt: now,
      ipAddress: null,
      userAgent: null,
    },
  };
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
  if (await isGuestRequest()) return guestSession();
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
