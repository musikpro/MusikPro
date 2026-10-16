import { NextResponse } from "next/server";
import { listAuditForExport } from "@/lib/admin/audit";
import { auditRowsToCsv } from "@/lib/admin/audit-csv";
import { auth } from "@/lib/auth";
import { ownerTwoFactorEnabled } from "@/lib/auth/owner-two-factor";
import { hasAppRole } from "@/lib/auth/permissions";
import { hasVerifiedTotp } from "@/lib/auth/totp-status";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/security/audit";
import { auditFiltersSchema } from "@/lib/validation/audit-filters";

export const runtime = "nodejs";

/**
 * Export CSV du journal d'audit (bouton « Exporter en CSV » de /admin/audit). Mêmes filtres que la page,
 * revalidés ici ; réservé au Super Admin (le journal contient e-mails et adresses IP), avec le même double
 * facteur propriétaire que requireAdmin(). Chaque export est lui-même consigné (audit.exported).
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!hasAppRole(role, "admin")) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  if (ownerTwoFactorEnabled() && !(await hasVerifiedTotp(session.user.id)))
    return NextResponse.json({ error: "Double facteur requis." }, { status: 403 });

  const ip = clientIp(request);
  const limit = await rateLimit(`admin:audit-export:${session.user.id}:${ip}`, 6);
  if (limit.backend === "unavailable")
    return NextResponse.json({ error: "Le contrôle de débit est indisponible." }, { status: 503 });
  if (!limit.success)
    return NextResponse.json({ error: "Trop de requêtes. Réessaie dans un instant." }, { status: 429 });

  const params = new URL(request.url).searchParams;
  const parsed = auditFiltersSchema.safeParse({
    actor: params.get("actor") || undefined,
    action: params.get("action") || undefined,
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
  });
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Filtres invalides." }, { status: 400 });

  const rows = await listAuditForExport(parsed.data);
  await writeAuditLog({
    action: "audit.exported",
    actorId: session.user.id,
    targetType: "audit_logs",
    ip,
    metadata: {
      rows: rows.length,
      actor: parsed.data.actor ?? null,
      action: parsed.data.action ?? null,
      from: parsed.data.from ?? null,
      to: parsed.data.to ?? null,
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(auditRowsToCsv(rows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="journal-audit-${stamp}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
