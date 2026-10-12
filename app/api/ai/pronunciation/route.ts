import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { suggestPronunciation } from "@/lib/ai/pronunciation";
import { pronunciationRequestSchema } from "@/lib/validation/ai";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 4 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const limit = await rateLimit(`ai:pronunciation:${session.user.id}:${clientIp(request)}`, 60);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  const parsed = pronunciationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });

  return NextResponse.json(suggestPronunciation(parsed.data.name));
}
