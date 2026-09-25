import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { MusicJobOwnershipError, pollMusicJob } from "@/lib/ai/music-jobs";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

const jobIdSchema = z.string().uuid();

export async function GET(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const parsedId = jobIdSchema.safeParse((await ctx.params).id);
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const limit = await rateLimit(`music:jobs:${session.user.id}:${clientIp(request)}`, 60);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  try {
    const job = await pollMusicJob(parsedId.data, session.user.id);
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      title: job.title,
      style: job.style,
      instrumental: job.instrumental,
      durationSeconds: job.durationSeconds,
      audioUrl: job.audioUrl,
      coverUrl: job.coverUrl,
      wavUrl: job.wavUrl,
      failureReason: job.status === "failed" ? "La génération a échoué. Réessaie." : null,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    if (error instanceof MusicJobOwnershipError)
      return NextResponse.json({ error: "Génération introuvable." }, { status: 404 });
    return NextResponse.json({ error: "Impossible de récupérer l’état de la génération." }, { status: 502 });
  }
}
