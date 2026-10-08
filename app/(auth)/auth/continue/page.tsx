import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticatedDestination } from "@/lib/auth/destination";
import { getSession } from "@/lib/auth/session";
import { resolveExtraAdminSlugs } from "@/lib/auth/custom-roles";
import { ClientRedirect } from "@/components/auth/client-redirect";
import Loading from "./loading";

export default async function AuthContinuePage() {
  const session = await getSession();

  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role;
  const destination = authenticatedDestination(role, await resolveExtraAdminSlugs(role));

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
