import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, userQuery } from "@/db";
import { credits } from "@/db/schema";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

/** Current credit balance of the signed-in customer. Read-only, polled by the dashboard so the balance follows purchases and usage. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const limit = await rateLimit(`credits:balance:${session.user.id}:${clientIp(request)}`, 120);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  const [row] = await userQuery(
    session.user.id,
    db.select({ balance: credits.balance }).from(credits).where(eq(credits.userId, session.user.id)).limit(1),
  );
  return NextResponse.json({ balance: Number(row?.balance ?? 0) }, { headers: { "Cache-Control": "no-store" } });
}
