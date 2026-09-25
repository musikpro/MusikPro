import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { payments } from "@/db/schema";
import { reconcilePayment } from "@/lib/billing/reconcile";
import { writeAuditLog } from "@/lib/security/audit";
import { verifyCronRequest } from "@/lib/cron/auth";

export const runtime = "nodejs";

async function handle(request: Request) {
  if (!verifyCronRequest(request)) return new Response("Unauthorized", { status: 401 });
  const db = getServiceDb();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(inArray(payments.status, ["pending", "failed"]), gte(payments.createdAt, since)))
    .orderBy(desc(payments.createdAt))
    .limit(100);

  const result = { checked: 0, paid: 0, pending: 0, failed: 0, errors: 0 };
  for (const row of rows) {
    result.checked++;
    try {
      const r = await reconcilePayment(row.id);
      if (r.status === "paid") result.paid++;
      else if (r.status === "failed") result.failed++;
      else result.pending++;
    } catch (error) {
      result.errors++;
      await writeAuditLog({
        action: "payment.reconcile.failed",
        targetType: "payment",
        targetId: row.id,
        metadata: { error: error instanceof Error ? error.message : "unknown" },
      });
    }
  }
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
