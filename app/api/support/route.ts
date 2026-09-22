import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendSupportEmail } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";
import { demoSupportSchema } from "@/lib/validation/musikpro-demo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 16 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const limit = await rateLimit(`support:${session.user.id}:${clientIp(request)}`, 5, 3600);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le service de support est temporairement indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de messages envoyés. Réessaie plus tard." }, { status: 429 });

  const parsed = demoSupportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Vérifie les informations du formulaire." }, { status: 400 });

  try {
    await sendSupportEmail({
      requesterName: session.user.name || "Utilisateur MusikPro",
      requesterEmail: parsed.data.email,
      subject: parsed.data.subject,
      category: parsed.data.category,
      message: parsed.data.message,
      phone: parsed.data.phone,
    });
    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ error: "Le message n’a pas pu être envoyé. Réessaie dans un instant." }, { status: 503 });
  }
}
