import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMusicfulProvider } from "@/lib/ai/musicful";
import { createMusicJob, submitMusicJob } from "@/lib/ai/music-jobs";
import { musicfulGenerateRequestSchema } from "@/lib/validation/ai";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";
import { classifyMusicfulError } from "@/lib/ai/errors";
import { writeAuditLog } from "@/lib/security/audit";
import { createLogger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const maxDuration = 60;
const logger = createLogger("music-generate");

export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 48 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const provider = await getMusicfulProvider();
  if (!provider.enabled || !provider.apiKey) {
    return NextResponse.json({ error: "La génération audio n’est pas encore configurée.", code: "MUSICFUL_NOT_CONFIGURED" }, { status: 503 });
  }

  const limit = await rateLimit(`music:generate:${session.user.id}:${clientIp(request)}`, provider.maxGenerationsPerUserPerHour, 3600);
  if (limit.backend === "unavailable") return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success) return NextResponse.json({ error: "Trop de générations audio. Réessaie plus tard." }, { status: 429 });

  const parsed = musicfulGenerateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paramètres de génération invalides.", details: parsed.error.flatten() }, { status: 400 });

  const input = parsed.data;
  if (input.instrumental === 1 && !provider.allowInstrumental) {
    return NextResponse.json({ error: "La génération instrumentale est désactivée.", code: "MUSICFUL_CAPABILITY_DISABLED" }, { status: 403 });
  }
  if (!input.instrumental && input.lyrics && !provider.allowLyricsToMusic) {
    return NextResponse.json({ error: "La génération à partir de paroles est désactivée.", code: "MUSICFUL_CAPABILITY_DISABLED" }, { status: 403 });
  }
  if (!input.lyrics && !provider.allowTextToMusic) {
    return NextResponse.json({ error: "La génération à partir d’un style/texte est désactivée.", code: "MUSICFUL_CAPABILITY_DISABLED" }, { status: 403 });
  }
  if (!input.prompt && !input.lyrics && !input.style) {
    return NextResponse.json({ error: "Ajoute un style, une invite ou des paroles pour générer une chanson." }, { status: 400 });
  }

  const model = input.model || provider.model;
  const job = await createMusicJob(
    session.user.id,
    {
      ...input,
      instrumental: input.instrumental ?? (provider.defaultInstrumental ? 1 : 0),
      gender: input.gender ?? provider.defaultGender ?? "",
    },
    model,
  );

  try {
    const submitted = await submitMusicJob(job.id);
    await writeAuditLog({
      action: "musicful.generation.submitted",
      actorId: session.user.id,
      targetType: "music_generation_job",
      targetId: job.id,
      metadata: { model, instrumental: Boolean(input.instrumental) },
    });
    return NextResponse.json({ jobId: submitted.id, status: submitted.status });
  } catch (error) {
    const failure = classifyMusicfulError(error);
    logger.error("Musicful generation submit failed", { jobId: job.id, code: failure.code, providerStatus: failure.providerStatus });
    return NextResponse.json({ error: failure.message, code: failure.code, jobId: job.id }, { status: failure.status });
  }
}
