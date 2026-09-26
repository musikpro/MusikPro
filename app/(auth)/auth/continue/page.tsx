import { redirect } from "next/navigation";
import { authenticatedDestination } from "@/lib/auth/destination";
import { getSession } from "@/lib/auth/session";
import { resolveExtraAdminSlugs } from "@/lib/auth/custom-roles";

export default async function AuthContinuePage() {
  const session = await getSession();

  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role;
  redirect(authenticatedDestination(role, await resolveExtraAdminSlugs(role)));
}
