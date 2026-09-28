import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/permissions";
import { resolveExtraAdminSlugs } from "@/lib/auth/custom-roles";
import { getGeneratedSongOptionById } from "@/lib/trending/admin";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";

export const runtime = "nodejs";

const lookupSchema = z.object({ songGroupId: z.string().trim().min(1).max(200) });

/** Resolves an admin-typed song identifier (the songGroupId shown on /admin/generations) to a
 * displayable label for the Trending manual picker, so a song outside the top results returned
 * by listRecentGeneratedSongsForAdmin can still be added by ID. */
export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 2 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!isAdminRole(role, await resolveExtraAdminSlugs(role)))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const limit = await rateLimit(`admin:trending-lookup:${session.user.id}:${clientIp(request)}`, 30);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success) return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  const parsed = lookupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const option = await getGeneratedSongOptionById(parsed.data.songGroupId);
  if (!option) return NextResponse.json({ error: "Identifiant introuvable ou chanson non terminée." }, { status: 404 });

  return NextResponse.json({
    songGroupId: option.songGroupId,
    title: option.title,
    styleLabel: option.styleLabel,
    plays: option.plays,
  });
}
