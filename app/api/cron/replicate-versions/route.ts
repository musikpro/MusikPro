import { verifyCronRequest } from "@/lib/cron/auth";
import { checkForUpdates } from "@/lib/ai/audio-providers/replicate-versions";

export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * Daily DETECTION of new ACE-Step versions (skill Replicate-MusikPro-MP3 v1.1.0 §16.4). It only reads Replicate's
 * metadata and records the comparison: it never starts a paid prediction and never activates a version, whatever
 * it finds. The owner approves and activates from /admin/ai-providers/audio.
 */
async function handle(request: Request) {
  if (!verifyCronRequest(request)) return new Response("Unauthorized", { status: 401 });
  const result = await checkForUpdates(null);
  return Response.json({ ok: result.ok, message: result.message }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
