import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getMusicfulProvider } from "@/lib/ai/musicful";
import { MusicJobOwnershipError, requestWavConversion } from "@/lib/ai/music-jobs";
import { classifyMusicfulError } from "@/lib/ai/errors";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation } from "@/lib/security/request-guards";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

const jobIdSchema = z.string().uuid();

export async function POST(request: Request, ctx: Ctx) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const parsedId = jobIdSchema.safeParse((await ctx.params).id);
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const provider = await getMusicfulProvider();
  if (!provider.allowWavConversion) return NextResponse.json({ error: "La conversion WAV est désactivée." }, { status: 403 });

  const limit = await rateLimit(`music:wav:${session.user.id}:${clientIp(request)}`, 10);
  if (limit.backend === "unavailable") return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success) return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  try {
    const job = await requestWavConversion(parsedId.data, session.user.id);
    await writeAuditLog({ action: "musicful.wav.requested", actorId: session.user.id, targetType: "music_generation_job", targetId: job.id });
    return NextResponse.json({ jobId: job.id, wavUrl: job.wavUrl });
  } catch (error) {
    if (error instanceof MusicJobOwnershipError) return NextResponse.json({ error: "Génération introuvable." }, { status: 404 });
    if (error instanceof Error && error.message === "MUSIC_JOB_NOT_READY") {
      return NextResponse.json({ error: "La chanson doit d’abord être générée avec succès." }, { status: 409 });
    }
    const failure = classifyMusicfulError(error);
    return NextResponse.json({ error: failure.message, code: failure.code }, { status: failure.status });
  }
}
