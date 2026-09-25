import { lt } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { funnelEvents } from "@/db/schema";
import { verifyCronRequest } from "@/lib/cron/auth";

export const runtime = "nodejs";

const RETENTION_DAYS = 180;

async function handle(request: Request) {
  if (!verifyCronRequest(request)) return new Response("Unauthorized", { status: 401 });
  const db = getServiceDb();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const deleted = await db
    .delete(funnelEvents)
    .where(lt(funnelEvents.createdAt, cutoff))
    .returning({ id: funnelEvents.id });
  return Response.json(
    { deleted: deleted.length, cutoff: cutoff.toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
