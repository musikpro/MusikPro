import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { setSongGroupCover } from "@/lib/ai/songs";
import { isTrustedImageUrl } from "@/lib/storage/cloudinary";
import { MusicJobOwnershipError } from "@/lib/ai/music-jobs";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, requireContentType } from "@/lib/security/request-guards";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ groupId: string }> };

const groupIdSchema = z.string().uuid();
const coverSchema = z.object({ coverUrl: z.string().url() });

export async function PATCH(request: Request, ctx: Ctx) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const parsedId = groupIdSchema.safeParse((await ctx.params).groupId);
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const limit = await rateLimit(`songs:cover:${session.user.id}:${clientIp(request)}`, 30);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  const parsedBody = coverSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  if (!isTrustedImageUrl(parsedBody.data.coverUrl))
    return NextResponse.json({ error: "Cette image n'est pas hébergée sur un domaine autorisé." }, { status: 400 });

  try {
    await setSongGroupCover(session.user.id, parsedId.data, parsedBody.data.coverUrl);
    return NextResponse.json({ coverUrl: parsedBody.data.coverUrl });
  } catch (error) {
    if (error instanceof MusicJobOwnershipError)
      return NextResponse.json({ error: "Chanson introuvable." }, { status: 404 });
    throw error;
  }
}
