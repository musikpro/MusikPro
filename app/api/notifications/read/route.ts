import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markNotificationsRead } from "@/lib/notifications/server";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";
import { notificationsReadSchema } from "@/lib/validation/notifications";

export const runtime = "nodejs";

/** Marque des notifications (ou toutes) de l'utilisateur connecté comme lues. Idempotent. */
export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 8 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const limit = await rateLimit(`notifications:read:${session.user.id}:${clientIp(request)}`, 60);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  const parsed = notificationsReadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  try {
    await markNotificationsRead(session.user.id, "ids" in parsed.data ? parsed.data.ids : undefined);
  } catch {
    return NextResponse.json({ error: "Les notifications n'ont pas pu être mises à jour." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
