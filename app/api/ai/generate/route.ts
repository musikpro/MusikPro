import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runLyricsTask } from "@/lib/ai/lyrics";
import { getOpenAiProvider } from "@/lib/ai/provider";
import { aiLyricsTaskSchema } from "@/lib/validation/ai";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 48 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const provider = await getOpenAiProvider();
  const limit = await rateLimit(`ai:lyrics:${session.user.id}:${clientIp(request)}`, provider.requestsPerMinute);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de générations. Réessaie dans une minute." }, { status: 429 });
  const parsed = aiLyricsTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Paramètres de paroles invalides.", details: parsed.error.flatten() },
      { status: 400 },
    );
  try {
    const result = await runLyricsTask(parsed.data);
    return NextResponse.json({ lyrics: result.text, requestId: result.id });
  } catch (error) {
    const code = error instanceof Error ? error.message : "AI_REQUEST_FAILED";
    if (code === "AI_PROVIDER_NOT_CONFIGURED")
      return NextResponse.json({ error: "Le fournisseur de paroles n’est pas encore configuré." }, { status: 503 });
    if (code === "AI_CAPABILITY_DISABLED")
      return NextResponse.json({ error: "Cette fonction de paroles est désactivée." }, { status: 403 });
    return NextResponse.json(
      { error: "La génération des paroles a échoué. Vérifie la connexion OpenAI dans l’espace propriétaire." },
      { status: 502 },
    );
  }
}
