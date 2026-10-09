import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs } from "@/db/schema";
import { getAudioProviderConfig } from "@/lib/ai/musicful";
import { pollJobForProvider } from "@/lib/ai/audio-providers/dispatch";
import { getReplicateWebhookSecret } from "@/lib/ai/audio-providers/replicate";
import { isReplicatePredictionId, verifyReplicateWebhookSignature } from "@/lib/ai/audio-providers/replicate-model";
import { verifyAudioWebhookToken } from "@/lib/ai/audio-providers/webhook";
import { writeAuditLog } from "@/lib/security/audit";
import { createLogger } from "@/lib/observability/logger";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectOversizedRequest } from "@/lib/security/request-guards";

export const runtime = "nodejs";
const logger = createLogger("replicate-webhook");
const MAX_BODY_BYTES = 256 * 1024;
const tokenSchema = z
  .string()
  .min(20)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/);
const payloadSchema = z.object({ id: z.string().max(64) }).passthrough();

/**
 * Replicate callback. Two independent checks: the secret URL token (shared mechanism of the audio
 * providers) AND Replicate's cryptographic signature over the raw body (HMAC-SHA256, 5-minute replay
 * window). The payload is never trusted for its content: it only names a prediction, whose real state
 * and MP3 are then read from the Replicate API by the shared poller. That poller is idempotent, so a
 * duplicated, delayed or replayed delivery converges on the same state (no double credit, no second asset).
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const sizeFailure = rejectOversizedRequest(request, MAX_BODY_BYTES);
  if (sizeFailure) return sizeFailure;

  const limit = await rateLimit(`webhook:replicate:${clientIp(request)}`, 120);
  if (limit.backend === "unavailable") return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (!limit.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const token = tokenSchema.safeParse((await params).token);
  if (!token.success || !(await verifyAudioWebhookToken("replicate", token.data))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES)
    return NextResponse.json({ error: "too_large" }, { status: 413 });

  const provider = await getAudioProviderConfig("replicate");
  if (!provider.apiKey) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const runtimeConfig = {
    apiKey: provider.apiKey,
    baseUrl: provider.baseUrl,
    model: provider.model,
    timeoutMs: provider.timeoutMs,
    maxRetries: provider.maxRetries,
  };
  let verified = false;
  try {
    // A failure may come from a rotated signing secret: read it again once before rejecting.
    for (const force of [false, true]) {
      const webhookSecret = await getReplicateWebhookSecret(runtimeConfig, force);
      verified = verifyReplicateWebhookSignature({ rawBody, headers: request.headers, webhookSecret });
      if (verified) break;
    }
  } catch (error) {
    logger.error("Replicate signing secret unavailable", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  if (!verified) {
    await writeAuditLog({ action: "ai.audio_provider.webhook.invalid_signature", metadata: { provider: "replicate" } });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let json: unknown = null;
  try {
    json = JSON.parse(rawBody);
  } catch {
    json = null;
  }
  const payload = payloadSchema.safeParse(json);
  if (!payload.success || !isReplicatePredictionId(payload.data.id)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const jobs = await getServiceDb()
    .select({ id: musicGenerationJobs.id, userId: musicGenerationJobs.userId })
    .from(musicGenerationJobs)
    .where(and(eq(musicGenerationJobs.provider, "replicate"), eq(musicGenerationJobs.providerTaskId, payload.data.id)));
  await Promise.all(
    jobs
      .filter((job): job is { id: string; userId: string } => Boolean(job.userId))
      .map((job) =>
        pollJobForProvider(job.id, job.userId).catch((error) => {
          logger.error("Replicate webhook poll failed", {
            jobId: job.id,
            error: error instanceof Error ? error.message : "unknown",
          });
        }),
      ),
  );
  return NextResponse.json({ ok: true, matched: jobs.length });
}
