import { NextResponse } from "next/server";
import { getReadinessReport } from "@/lib/health/readiness";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getReadinessReport();
  return NextResponse.json(report, {
    status: report.status === "ready" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
