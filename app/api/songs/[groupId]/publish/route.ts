import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { publishSongGroup, SongNotReadyError } from "@/lib/ai/songs";
import { MusicJobOwnershipError } from "@/lib/ai/music-jobs";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation } from "@/lib/security/request-guards";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ groupId: string }> };

const groupIdSchema = z.string().uuid();
const bodySchema = z.object({ jobId: z.string().min(1).max(200).optional() });

export async function POST(request: Request, ctx: Ctx) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const parsedId = groupIdSchema.safeParse((await ctx.params).groupId);
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  let rawBody: unknown = {};
  const contentLength = request.headers.get("content-length");
  if (contentLength && contentLength !== "0") {
    rawBody = await request.json().catch(() => ({}));
  }
  const parsedBody = bodySchema.safeParse(rawBody);
  if (!parsedBody.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const limit = await rateLimit(`songs:publish:${session.user.id}:${clientIp(request)}`, 20);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  try {
    const { slug } = await publishSongGroup(session.user.id, parsedId.data, parsedBody.data.jobId);
    await writeAuditLog({
      action: "musicful.song.published",
      actorId: session.user.id,
      targetType: "song_group",
      targetId: parsedId.data,
    });
    return NextResponse.json({ url: new URL(`/s/${slug}`, request.url).toString() });
  } catch (error) {
    if (error instanceof MusicJobOwnershipError)
      return NextResponse.json({ error: "Chanson introuvable." }, { status: 404 });
    if (error instanceof SongNotReadyError)
      return NextResponse.json({ error: "Cette chanson n'est pas encore prête à être publiée." }, { status: 409 });
    throw error;
  }
}
