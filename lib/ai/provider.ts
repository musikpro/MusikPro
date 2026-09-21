import "server-only";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { getServiceDb } from "@/db";
import { aiProviderConfigs } from "@/db/schema";
import { decryptSecret } from "./secrets";

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

export function createOpenAiClient(apiKey: string) {
  return new OpenAI({ apiKey, timeout: 45_000, maxRetries: 1 });
}
