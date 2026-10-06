import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNotificationPreferences, saveNotificationPreferences } from "@/lib/notifications/devices";
import { isPushConfigured } from "@/lib/notifications/fcm";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";
import { notificationPreferencesSchema } from "@/lib/validation/notifications";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

async function authorize(request: Request, scope: string): Promise<string | Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401, headers: NO_STORE });
  }
  const limit = await rateLimit(`notification-prefs:${scope}:${session.user.id}:${clientIp(request)}`, 30);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503, headers: NO_STORE });
  if (!limit.success)
    return NextResponse.json(
      { error: "Trop de requêtes. Réessaie dans un instant." },
      { status: 429, headers: NO_STORE },
    );
  return session.user.id;
}

/** Préférences de notification de l'utilisateur connecté (tout activé par défaut) et disponibilité des notifications push. */
export async function GET(request: Request) {
  const userId = await authorize(request, "read");
  if (typeof userId !== "string") return userId;
  try {
    return NextResponse.json(
      { ...(await getNotificationPreferences(userId)), pushAvailable: isPushConfigured() },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json({ error: "Les préférences sont indisponibles." }, { status: 503, headers: NO_STORE });
  }
}

/** Enregistre les préférences de notification de l'utilisateur connecté. */
export async function PUT(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 2 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const userId = await authorize(request, "write");
  if (typeof userId !== "string") return userId;
  const parsed = notificationPreferencesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Préférences invalides." }, { status: 400 });
  try {
    await saveNotificationPreferences(userId, parsed.data);
  } catch {
    return NextResponse.json({ error: "Les préférences n'ont pas pu être enregistrées." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
