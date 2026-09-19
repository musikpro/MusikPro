import { redirect } from "next/navigation";
import { authenticatedDestination } from "@/lib/auth/destination";
import { getSession } from "@/lib/auth/session";

export default async function AuthContinuePage() {
  const session = await getSession();

  if (!session?.user) redirect("/login");

  redirect(authenticatedDestination((session.user as { role?: string }).role));
}
