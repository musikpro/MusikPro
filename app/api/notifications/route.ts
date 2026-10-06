import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications/server";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

/** Notifications de l'utilisateur connecté (les plus récentes) et nombre de non lues. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401, headers: NO_STORE });
  }
  const limit = await rateLimit(`notifications:list:${session.user.id}:${clientIp(request)}`, 60);
  if (limit.backend === "unavailable") {
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503, headers: NO_STORE });
  }
  if (!limit.success) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessaie dans un instant." },
      { status: 429, headers: NO_STORE },
    );
  }
  try {
    return NextResponse.json(await listNotifications(session.user.id), { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Les notifications sont indisponibles." }, { status: 503, headers: NO_STORE });
  }
}
