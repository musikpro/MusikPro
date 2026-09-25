import { getPaymentProvider } from "@/lib/payments";
import { processPaymentWebhook } from "@/lib/billing/webhook";
import { writeAuditLog } from "@/lib/security/audit";
import { providerEnvironmentConfigured } from "@/lib/payments/configured";
import { chariowIsConfigured } from "@/lib/payments/chariow-config";
import type { PaymentProviderId } from "@/lib/payments/types";
import { createLogger } from "@/lib/observability/logger";
import { requestId, withRequestId } from "@/lib/observability/request-id";

const log = createLogger("payment-webhook");

export const runtime = "nodejs";

const MAX_WEBHOOK_BYTES = 1_000_000;

async function readLimitedBody(request: Request): Promise<Uint8Array | null> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_WEBHOOK_BYTES) return null;
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_WEBHOOK_BYTES) {
        await reader.cancel("webhook payload too large").catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function replayRequest(request: Request, body: Uint8Array) {
  return new Request(request.url, {
    method: "POST",
    headers: new Headers(request.headers),
    body: new Uint8Array(body).buffer,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const rid = requestId(request);
  const rawBody = await readLimitedBody(request);
  if (!rawBody)
    return new Response("Payload too large", {
      status: 413,
      headers: withRequestId(undefined, rid),
    });

  const { provider: providerId } = await params;
  const configured =
    providerId === "chariow"
      ? await chariowIsConfigured()
      : providerEnvironmentConfigured(providerId as PaymentProviderId);
  if (!configured) {
    return new Response("Not found", {
      status: 404,
      headers: withRequestId(undefined, rid),
    });
  }
  let provider;
  try {
    provider = getPaymentProvider(providerId);
  } catch {
    return new Response("Unknown provider", {
      status: 404,
      headers: withRequestId(undefined, rid),
    });
  }

  const valid = await provider.verifyWebhook(replayRequest(request, rawBody));
  if (!valid) {
    await writeAuditLog({
      action: "payment.webhook.invalid_signature",
      metadata: { provider: providerId },
    });
    log.warn("Invalid webhook signature", {
      provider: providerId,
      requestId: rid,
    });
    return new Response("Invalid signature", {
      status: 401,
      headers: withRequestId(undefined, rid),
    });
  }

  try {
    const event = await provider.parseWebhook(replayRequest(request, rawBody));
    const result = await processPaymentWebhook(provider, event);
    await writeAuditLog({
      action: "payment.webhook.processed",
      metadata: {
        provider: providerId,
        eventId: event.id,
        type: event.type,
        ...result,
      },
    });
    log.info("Webhook processed", {
      provider: providerId,
      eventId: event.id,
      type: event.type,
      requestId: rid,
    });
    return Response.json(
      { received: true, eventId: event.id, ...result },
      { headers: withRequestId({ "Cache-Control": "no-store" }, rid) },
    );
  } catch (error) {
    await writeAuditLog({
      action: "payment.webhook.processing_failed",
      metadata: {
        provider: providerId,
        error: error instanceof Error ? error.message.slice(0, 200) : "unknown",
      },
    });
    log.error("Webhook processing failed", {
      provider: providerId,
      requestId: rid,
      error: error instanceof Error ? error.message : "unknown",
    });
    return new Response("Webhook processing failed", {
      status: 500,
      headers: withRequestId(undefined, rid),
    });
  }
}
