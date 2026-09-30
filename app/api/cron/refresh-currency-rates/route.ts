import { revalidatePath } from "next/cache";
import { verifyCronRequest } from "@/lib/cron/auth";
import { syncAutoCurrencyRates } from "@/lib/credit-plans/fx-sync";
import { writeAuditLog } from "@/lib/security/audit";

export const runtime = "nodejs";

/** Daily refresh of the currency exchange rates (see vercel.json) — same job as the admin button "Actualiser les taux maintenant". */
async function handle(request: Request) {
  if (!verifyCronRequest(request)) return new Response("Unauthorized", { status: 401 });
  const headers = { "Cache-Control": "no-store" };
  try {
    const outcome = await syncAutoCurrencyRates();
    if (!outcome.ok) return Response.json({ ok: false, message: outcome.message }, { status: 502, headers });
    await writeAuditLog({
      action: "currency.rates.synced",
      targetType: "currency_settings",
      targetId: "global",
      metadata: { updated: outcome.updated, missing: outcome.missing, source: "cron" },
    });
    ["/admin/languages", "/dashboard/credits", "/dashboard/create/pack", "/dashboard"].forEach((path) =>
      revalidatePath(path),
    );
    return Response.json({ ok: true, message: outcome.message, updated: outcome.updated }, { headers });
  } catch {
    return Response.json({ ok: false, message: "Actualisation des taux impossible." }, { status: 500, headers });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
