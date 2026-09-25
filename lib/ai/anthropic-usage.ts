import "server-only";
import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { aiProviderConfigs } from "@/db/schema";
import { decryptSecret } from "./secrets";
import { anthropicCostReportSchema } from "@/lib/validation/ai";

export class AnthropicAdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AnthropicAdminApiError";
    this.status = status;
  }
}

async function getAnthropicRow() {
  const [row] = await getServiceDb()
    .select()
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.provider, "anthropic"))
    .limit(1);
  return row ?? null;
}

/** Safe, secret-free read of whether an Admin API key is configured — for rendering the page. */
export async function getAnthropicAdminKeyStatus(): Promise<{ configured: boolean; last4: string | null }> {
  const row = await getAnthropicRow();
  return { configured: Boolean(row?.adminApiKeyCiphertext), last4: row?.adminApiKeyLast4 ?? null };
}

async function getDecryptedAnthropicAdminKey(): Promise<string | null> {
  const row = await getAnthropicRow();
  if (!row?.adminApiKeyCiphertext || !row.adminApiKeyIv || !row.adminApiKeyAuthTag) return null;
  return decryptSecret({
    ciphertext: row.adminApiKeyCiphertext,
    iv: row.adminApiKeyIv,
    authTag: row.adminApiKeyAuthTag,
  });
}

export type AnthropicMonthlySpend = {
  configured: boolean;
  amountUsd: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
};

/**
 * Sums the organization's Anthropic Cost Report for the current UTC month to date. Requires an
 * Admin API key (sk-ant-admin01-…) — the standard lyrics-generation key has no access to this
 * endpoint. Anthropic only exposes spend (USD), never a remaining prepaid balance; that figure
 * stays console.anthropic.com-only regardless of key type.
 */
export async function getAnthropicMonthlySpend(): Promise<AnthropicMonthlySpend | { configured: false }> {
  const adminApiKey = await getDecryptedAnthropicAdminKey();
  if (!adminApiKey) return { configured: false };

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const params = new URLSearchParams({
    starting_at: periodStart.toISOString(),
    ending_at: now.toISOString(),
    bucket_width: "1d",
    limit: "31",
  });
  const response = await fetch(`https://api.anthropic.com/v1/organizations/cost_report?${params}`, {
    method: "GET",
    headers: { "anthropic-version": "2023-06-01", "x-api-key": adminApiKey },
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    throw new AnthropicAdminApiError(
      `Anthropic cost report request failed with HTTP ${response.status}`,
      response.status,
    );
  }
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new AnthropicAdminApiError("Réponse Anthropic illisible.", 502);
  }
  const parsed = anthropicCostReportSchema.safeParse(json);
  if (!parsed.success) throw new AnthropicAdminApiError("Réponse Anthropic inattendue.", 502);

  const totalCents = parsed.data.data.reduce(
    (sum, bucket) => sum + bucket.results.reduce((bucketSum, result) => bucketSum + Number(result.amount || 0), 0),
    0,
  );
  const currency = parsed.data.data[0]?.results[0]?.currency ?? "USD";
  return { configured: true, amountUsd: totalCents / 100, currency, periodStart, periodEnd: now };
}
