import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentProviderConfigs } from "@/db/schema";
import { decryptSecret } from "@/lib/ai/secrets";

export type StoredEncryptedSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;
  last4?: string;
};

export type ChariowStoredConfig = {
  apiKey?: StoredEncryptedSecret;
  webhookSecret?: StoredEncryptedSecret;
};

export async function getChariowConfiguration() {
  const [row] = await db
    .select()
    .from(paymentProviderConfigs)
    .where(eq(paymentProviderConfigs.provider, "chariow"))
    .limit(1);
  const config = (row?.config || {}) as ChariowStoredConfig;
  const apiKey = config.apiKey
    ? decryptSecret(config.apiKey)
    : process.env.CHARIOW_API_KEY?.trim() || "";
  const webhookSecret = config.webhookSecret
    ? decryptSecret(config.webhookSecret)
    : process.env.CHARIOW_WEBHOOK_SECRET?.trim() || "";
  return { row, config, apiKey, webhookSecret };
}

export async function chariowIsConfigured() {
  try {
    const { row, apiKey } = await getChariowConfiguration();
    return Boolean(row?.enabled && apiKey);
  } catch {
    return false;
  }
}
