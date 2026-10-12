import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticatedDestination } from "@/lib/auth/destination";
import { getSession } from "@/lib/auth/session";
import { resolveExtraAdminSlugs } from "@/lib/auth/custom-roles";
import { GUEST_RESUME_COOKIE, GUEST_RESUME_PATH } from "@/lib/guest/resume";
import { ClientRedirect } from "@/components/auth/client-redirect";
import Loading from "./loading";

export default async function AuthContinuePage() {
  const session = await getSession();

  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role;
  const baseDestination = authenticatedDestination(role, await resolveExtraAdminSlugs(role));
  // Visiteur invité qui vient de se connecter : retour au parcours de création (clients uniquement, destination fixe).
  const resumeGuest = baseDestination === "/dashboard" && (await cookies()).has(GUEST_RESUME_COOKIE);
  const destination = resumeGuest ? GUEST_RESUME_PATH : baseDestination;

  // WebView de l'application (« ; wv) » dans le user-agent) : redirection serveur, comportement d'origine.
  // Navigateur (Chrome après la connexion Google) : redirection côté client, car une redirection serveur vers
  // /dashboard est capturée par le lien d'application Android, qui ouvre l'application sur /login sans session.
  const userAgent = (await headers()).get("user-agent") ?? "";
  if (/;\s*wv\)/.test(userAgent)) redirect(destination);

  return (
    <>
      <Loading />
      <ClientRedirect to={destination} />
    </>
  );
}
