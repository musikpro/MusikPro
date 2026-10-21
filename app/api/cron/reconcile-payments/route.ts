import { and, desc, gte, inArray } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { payments } from "@/db/schema";
import { reconcilePayment } from "@/lib/billing/reconcile";
import { logReconcileFailures, type ReconcileFailure } from "@/lib/billing/reconcile-failures";
import { verifyCronRequest } from "@/lib/cron/auth";
import { withTimeout } from "@/lib/cron/with-timeout";

export const runtime = "nodejs";
export const maxDuration = 60;

/** EasyCron abandonne à 60 s : on s'arrête avant, et un paiement dont le fournisseur ne répond pas ne bloque pas les suivants. */
const TIME_BUDGET_MS = 45_000;
const PER_PAYMENT_TIMEOUT_MS = 15_000;

async function handle(request: Request) {
  if (!verifyCronRequest(request)) return new Response("Unauthorized", { status: 401 });
  const startedAt = Date.now();
  const db = getServiceDb();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(inArray(payments.status, ["pending", "failed"]), gte(payments.createdAt, since)))
    .orderBy(desc(payments.createdAt))
    .limit(100);

  const result = { checked: 0, paid: 0, pending: 0, failed: 0, errors: 0, skipped: 0 };
  const failures: ReconcileFailure[] = [];
  for (const [index, row] of rows.entries()) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      result.skipped = rows.length - index;
      break;
    }
    result.checked++;
    try {
      const r = await withTimeout(reconcilePayment(row.id), PER_PAYMENT_TIMEOUT_MS, "Réconciliation du paiement");
      if (r.status === "paid") result.paid++;
      else if (r.status === "failed") result.failed++;
      else result.pending++;
    } catch (error) {
      result.errors++;
      failures.push({ paymentId: row.id, error: error instanceof Error ? error.message : "unknown" });
    }
  }
  // Un seul passage en base pour les échecs, sans réécrire ceux déjà journalisés ces dernières 24 h.
  await logReconcileFailures(failures);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
