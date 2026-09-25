import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { getServiceDb } from "@/db";
import { aiProviderConfigs } from "@/db/schema";
import { decryptSecret } from "./secrets-core";

export async function getOpenAiProvider() {
  const [stored] = await getServiceDb()
    .select()
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.provider, "openai"))
    .limit(1);
  const apiKey =
    stored?.apiKeyCiphertext && stored.apiKeyIv && stored.apiKeyAuthTag
      ? decryptSecret({ ciphertext: stored.apiKeyCiphertext, iv: stored.apiKeyIv, authTag: stored.apiKeyAuthTag })
      : process.env.OPENAI_API_KEY;
  return {
    config: stored,
    apiKey,
    enabled: stored ? stored.enabled : Boolean(apiKey),
    model: stored?.defaultModel || process.env.OPENAI_DEFAULT_MODEL || "gpt-5.6-terra",
    maxOutputTokens: stored?.maxOutputTokens || Number(process.env.OPENAI_MAX_OUTPUT_TOKENS) || 4000,
    requestsPerMinute: stored?.requestsPerMinute || 10,
  };
}

export async function getAnthropicProvider() {
  const [stored] = await getServiceDb()
    .select()
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.provider, "anthropic"))
    .limit(1);
  const apiKey =
    stored?.apiKeyCiphertext && stored.apiKeyIv && stored.apiKeyAuthTag
      ? decryptSecret({ ciphertext: stored.apiKeyCiphertext, iv: stored.apiKeyIv, authTag: stored.apiKeyAuthTag })
      : process.env.ANTHROPIC_API_KEY;
  return {
    provider: "anthropic" as const,
    config: stored,
    apiKey,
    enabled: stored ? stored.enabled : Boolean(apiKey),
    model: stored?.defaultModel || process.env.ANTHROPIC_DEFAULT_MODEL || "claude-haiku-4-5-20251001",
    maxOutputTokens: stored?.maxOutputTokens || Number(process.env.ANTHROPIC_MAX_OUTPUT_TOKENS) || 4000,
    requestsPerMinute: stored?.requestsPerMinute || 10,
  };
}

export async function getLyricsProvider() {
  const [selected] = await getServiceDb()
    .select({ provider: aiProviderConfigs.provider })
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.isDefaultForLyrics, true))
    .limit(1);
  return selected?.provider === "anthropic"
    ? getAnthropicProvider()
    : getOpenAiProvider().then((value) => ({ ...value, provider: "openai" as const }));
}

export function createOpenAiClient(apiKey: string) {
  return new OpenAI({ apiKey, timeout: 45_000, maxRetries: 1 });
}
