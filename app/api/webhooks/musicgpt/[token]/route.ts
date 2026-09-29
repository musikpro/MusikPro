import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs } from "@/db/schema";
import { pollJobForProvider } from "@/lib/ai/audio-providers/dispatch";
import { verifyAudioWebhookToken } from "@/lib/ai/audio-providers/webhook";
import { createLogger } from "@/lib/observability/logger";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectOversizedRequest } from "@/lib/security/request-guards";

export const runtime = "nodejs";
const logger = createLogger("musicgpt-webhook");
const tokenSchema = z.string().min(20).max(200).regex(/^[A-Za-z0-9_-]+$/);
const payloadSchema = z.record(z.string(), z.unknown());

/** Collects the conversion/task ids a MusicGPT callback mentions, whatever its exact nesting. */
function collectIds(value: unknown, found = new Set<string>(), depth = 0): Set<string> {
  if (depth > 3 || !value || typeof value !== "object") return found;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "string" && /^(conversion_id(_\d)?|task_id|id)$/.test(key) && item.length < 200) found.add(item);
    else if (item && typeof item === "object") collectIds(item, found, depth + 1);
  }
  return found;
}

/**
 * MusicGPT callback. It documents no signature, so security rests on the secret URL token, and the
 * payload is never trusted: it only names a job, whose real state and MP3 are then fetched from the
 * MusicGPT API by the shared poller (idempotent — repeated callbacks converge on the same state).
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sizeFailure = rejectOversizedRequest(request, 256 * 1024);
  if (sizeFailure) return sizeFailure;

  const limit = await rateLimit(`webhook:musicgpt:${clientIp(request)}`, 120);
  if (limit.backend === "unavailable") return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (!limit.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const token = tokenSchema.safeParse((await params).token);
  if (!token.success || !(await verifyAudioWebhookToken("musicgpt", token.data))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const payload = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  const ids = [...collectIds(payload.data)];
  if (!ids.length) return NextResponse.json({ ok: true, matched: 0 });

  const jobs = await getServiceDb()
    .select({ id: musicGenerationJobs.id, userId: musicGenerationJobs.userId })
    .from(musicGenerationJobs)
    .where(and(eq(musicGenerationJobs.provider, "musicgpt"), inArray(musicGenerationJobs.providerTaskId, ids)));
  await Promise.all(
    jobs
      .filter((job): job is { id: string; userId: string } => Boolean(job.userId))
      .map((job) =>
        pollJobForProvider(job.id, job.userId).catch((error) => {
          logger.error("MusicGPT webhook poll failed", { jobId: job.id, error: error instanceof Error ? error.message : "unknown" });
        }),
      ),
  );
  return NextResponse.json({ ok: true, matched: jobs.length });
}
