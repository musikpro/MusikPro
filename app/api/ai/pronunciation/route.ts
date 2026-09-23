import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { suggestPronunciation } from "@/lib/ai/pronunciation";
import { getLyricsProvider } from "@/lib/ai/provider";
import { pronunciationRequestSchema } from "@/lib/validation/ai";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";
import { classifyAnthropicError, classifyOpenAiError } from "@/lib/ai/errors";
import { createLogger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const maxDuration = 30;
const logger = createLogger("ai-pronunciation");

export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 4 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const provider = await getLyricsProvider();
  const limit = await rateLimit(`ai:pronunciation:${session.user.id}:${clientIp(request)}`, Math.max(20, provider.requestsPerMinute * 2));
  if (limit.backend === "unavailable") return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success) return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  const parsed = pronunciationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });

  try {
    const result = await suggestPronunciation(parsed.data.name, parsed.data.language);
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "AI_REQUEST_FAILED";
    if (code === "AI_PROVIDER_NOT_CONFIGURED") {
      return NextResponse.json({ error: "La suggestion de prononciation n’est pas encore configurée." }, { status: 503 });
    }
    const failure = provider.provider === "anthropic" ? classifyAnthropicError(error) : classifyOpenAiError(error);
    logger.error("AI pronunciation request failed", {
      provider: provider.provider,
      code: failure.code,
      providerStatus: failure.providerStatus,
      providerRequestId: failure.providerRequestId,
    });
    return NextResponse.json({ error: failure.message, code: failure.code }, { status: failure.status });
  }
}
