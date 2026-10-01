import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getSongGroupForUser } from "@/lib/ai/songs";
import { hideDiscoverSong, restoreDiscoverSong } from "@/lib/discover/server";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation } from "@/lib/security/request-guards";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ groupId: string }> };

const groupIdSchema = z.string().uuid();

/**
 * Every completed song appears in the client "Découvrir" page automatically. DELETE lets the song's
 * owner remove it from there, POST puts it back — the song itself and its public link are untouched.
 */
async function setListed(request: Request, ctx: Ctx, listed: boolean) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const parsedId = groupIdSchema.safeParse((await ctx.params).groupId);
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const limit = await rateLimit(`songs:discover:${session.user.id}:${clientIp(request)}`, 30);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  // Only the creator can change their own song's presence in Découvrir.
  const song = await getSongGroupForUser(session.user.id, parsedId.data);
  if (!song) return NextResponse.json({ error: "Chanson introuvable." }, { status: 404 });

  if (listed) {
    const restored = await restoreDiscoverSong(parsedId.data, false);
    if (!restored)
      return NextResponse.json(
        { error: "Cette chanson a été retirée de Découvrir par l’équipe MusikPro." },
        { status: 403 },
      );
  } else {
    await hideDiscoverSong(parsedId.data, "owner");
  }
  await writeAuditLog({
    action: listed ? "discover.song.restored" : "discover.song.removed",
    actorId: session.user.id,
    targetType: "song_group",
    targetId: parsedId.data,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, ctx: Ctx) {
  return setListed(request, ctx, false);
}

export async function POST(request: Request, ctx: Ctx) {
  return setListed(request, ctx, true);
}
