import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getSongGroupForUser, removeSongGroupForUser, setSongVersionLiked, incrementSongVersionPlays } from "@/lib/ai/songs";
import { MusicJobOwnershipError } from "@/lib/ai/music-jobs";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, requireContentType } from "@/lib/security/request-guards";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ groupId: string }> };

const groupIdSchema = z.string().uuid();
const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("toggle-like"), jobId: z.string().uuid(), liked: z.boolean() }),
  z.object({ action: z.literal("increment-play"), jobId: z.string().uuid() }),
]);

export async function GET(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const parsedId = groupIdSchema.safeParse((await ctx.params).groupId);
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const limit = await rateLimit(`songs:detail:${session.user.id}:${clientIp(request)}`, 60);
  if (limit.backend === "unavailable") return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success) return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  const song = await getSongGroupForUser(session.user.id, parsedId.data);
  if (!song) return NextResponse.json({ error: "Chanson introuvable." }, { status: 404 });
  return NextResponse.json({ song });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const parsedId = groupIdSchema.safeParse((await ctx.params).groupId);
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const limit = await rateLimit(`songs:patch:${session.user.id}:${clientIp(request)}`, 120);
  if (limit.backend === "unavailable") return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success) return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  const parsedBody = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });

  try {
    const version =
      parsedBody.data.action === "toggle-like"
        ? await setSongVersionLiked(session.user.id, parsedBody.data.jobId, parsedBody.data.liked)
        : await incrementSongVersionPlays(session.user.id, parsedBody.data.jobId);
    return NextResponse.json({ version });
  } catch (error) {
    if (error instanceof MusicJobOwnershipError) return NextResponse.json({ error: "Version introuvable." }, { status: 404 });
    throw error;
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const parsedId = groupIdSchema.safeParse((await ctx.params).groupId);
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  await removeSongGroupForUser(session.user.id, parsedId.data);
  await writeAuditLog({ action: "musicful.song.removed", actorId: session.user.id, targetType: "song_group", targetId: parsedId.data });
  return NextResponse.json({ ok: true });
}
