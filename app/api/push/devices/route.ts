import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { registerPushDevice, removePushDevice } from "@/lib/notifications/devices";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";
import { pushDeviceRegisterSchema, pushDeviceRemoveSchema } from "@/lib/validation/notifications";

export const runtime = "nodejs";

/** Renvoie l'identifiant de l'utilisateur connecté, ou la réponse d'erreur à retourner telle quelle. */
async function authorize(request: Request, scope: string): Promise<string | Response> {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 8 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const limit = await rateLimit(`push-devices:${scope}:${session.user.id}:${clientIp(request)}`, 30);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });
  return session.user.id;
}

/** Enregistre l'appareil de l'utilisateur connecté pour les notifications push (réassigne le jeton s'il change de compte). */
export async function POST(request: Request) {
  const userId = await authorize(request, "register");
  if (typeof userId !== "string") return userId;
  const parsed = pushDeviceRegisterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Appareil invalide." }, { status: 400 });
  try {
    await registerPushDevice(userId, parsed.data);
  } catch {
    return NextResponse.json({ error: "L'appareil n'a pas pu être enregistré." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

/** Retire l'appareil du compte connecté. Idempotent ; ne touche jamais l'appareil d'un autre compte. */
export async function DELETE(request: Request) {
  const userId = await authorize(request, "remove");
  if (typeof userId !== "string") return userId;
  const parsed = pushDeviceRemoveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Appareil invalide." }, { status: 400 });
  try {
    await removePushDevice(userId, parsed.data.token);
  } catch {
    return NextResponse.json({ error: "L'appareil n'a pas pu être retiré." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
