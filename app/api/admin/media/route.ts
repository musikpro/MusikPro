import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/permissions";
import { resolveExtraAdminSlugs } from "@/lib/auth/custom-roles";
import { listMediaAssets } from "@/lib/media/admin";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

/**
 * Read-only listing of the shared media library (the Médias menu) for admin forms that let the
 * owner pick an existing image in a modal — lazily fetched when the modal opens, so pages that
 * merely contain such a form don't each pay for a Cloudinary Admin API call on every render.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!isAdminRole(role, await resolveExtraAdminSlugs(role)))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const limit = await rateLimit(`admin:media-list:${session.user.id}:${clientIp(request)}`, 30);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success) return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  return NextResponse.json({ assets: await listMediaAssets() });
}
