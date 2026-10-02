import { NextResponse } from "next/server";
import { overlayLocaleSchema } from "@/lib/i18n/overlay-schema";
import { loadOverlay } from "@/lib/i18n/overlay-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const locale = overlayLocaleSchema.safeParse(new URL(request.url).searchParams.get("locale"));
  if (!locale.success) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(await loadOverlay(locale.data), {
    headers: { "Cache-Control": "public, max-age=0, must-revalidate" },
  });
}
