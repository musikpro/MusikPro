import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listSongGroupsForUser } from "@/lib/ai/songs";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const limit = await rateLimit(`songs:list:${session.user.id}:${clientIp(request)}`, 60);
  if (limit.backend === "unavailable") return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success) return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  const songs = await listSongGroupsForUser(session.user.id);
  return NextResponse.json({ songs });
}
