import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/permissions";
import { resolveExtraAdminSlugs } from "@/lib/auth/custom-roles";
import { generatePhonePrefixRule } from "@/lib/ai/phone-prefix";
import { getLyricsProvider } from "@/lib/ai/provider";
import { phonePrefixRequestSchema } from "@/lib/validation/ai";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";
import { classifyAnthropicError, classifyOpenAiError } from "@/lib/ai/errors";
import { createLogger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const maxDuration = 120;
const logger = createLogger("admin-ai-phone-prefix");

export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 8 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!isAdminRole(role, await resolveExtraAdminSlugs(role)))
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const provider = await getLyricsProvider();
  const limit = await rateLimit(`ai:phone-prefix:${session.user.id}:${clientIp(request)}`, provider.requestsPerMinute);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de générations. Réessaie dans une minute." }, { status: 429 });

  const parsed = phonePrefixRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Paramètres invalides.", details: parsed.error.flatten() }, { status: 400 });

  try {
    const result = await generatePhonePrefixRule(parsed.data);
    return NextResponse.json({
      dialCode: result.dialCode,
      digits: result.digits,
      example: result.example,
      webSearch: result.webSearch,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "AI_REQUEST_FAILED";
    if (code === "AI_PROVIDER_NOT_CONFIGURED")
      return NextResponse.json(
        { error: "Le fournisseur IA n’est pas encore configuré dans Capacités IA." },
        { status: 503 },
      );
    if (code === "AI_BAD_FORMAT")
      return NextResponse.json({ error: "La réponse de l’IA n’avait pas le bon format. Réessaie." }, { status: 422 });
    if (code === "CONTENT_BLOCKED_RESULT")
      return NextResponse.json({ error: "Le résultat généré n’a pas pu être validé. Réessaie." }, { status: 422 });
    const failure = provider.provider === "anthropic" ? classifyAnthropicError(error) : classifyOpenAiError(error);
    logger.error("Phone prefix rule generation failed", {
      provider: provider.provider,
      code: failure.code,
      providerStatus: failure.providerStatus,
      providerRequestId: failure.providerRequestId,
    });
    return NextResponse.json({ error: failure.message, code: failure.code }, { status: failure.status });
  }
}
