import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { audioProviderConfigs } from "@/db/schema";
import { encryptSecret, tryDecryptSecret } from "../secrets";
import { getAudioProviderDefinition } from "./catalog";

/** Public origin used to build callback URLs (must be HTTPS: providers refuse plain HTTP). */
function publicBaseUrl(): string | null {
  const raw = process.env.PAYMENT_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

async function readToken(providerId: string): Promise<string | null> {
  const [row] = await getServiceDb()
    .select({
      ciphertext: audioProviderConfigs.webhookTokenCiphertext,
      iv: audioProviderConfigs.webhookTokenIv,
      authTag: audioProviderConfigs.webhookTokenAuthTag,
    })
    .from(audioProviderConfigs)
    .where(eq(audioProviderConfigs.provider, getAudioProviderDefinition(providerId).id))
    .limit(1);
  if (!row?.ciphertext || !row.iv || !row.authTag) return null;
  return tryDecryptSecret({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag }) ?? null;
}

/** Full callback URL of a provider, or null when no token/HTTPS origin is available (polling then applies). */
export async function getAudioWebhookUrl(providerId: string): Promise<string | null> {
  try {
    const base = publicBaseUrl();
    const token = await readToken(providerId);
    if (!base || !token) return null;
    return `${base}/api/webhooks/${getAudioProviderDefinition(providerId).id}/${token}`;
  } catch {
    return null;
  }
}

export async function verifyAudioWebhookToken(providerId: string, candidate: string): Promise<boolean> {
  try {
    const token = await readToken(providerId);
    if (!token) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(candidate);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Creates or replaces the secret token; the previous URL stops working immediately. */
export async function regenerateAudioWebhookToken(providerId: string) {
  const definition = getAudioProviderDefinition(providerId);
  const encrypted = encryptSecret(randomBytes(32).toString("base64url"));
  const database = getServiceDb();
  const values = {
    webhookTokenCiphertext: encrypted.ciphertext,
    webhookTokenIv: encrypted.iv,
    webhookTokenAuthTag: encrypted.authTag,
    updatedAt: new Date(),
  };
  const updated = await database
    .update(audioProviderConfigs)
    .set(values)
    .where(eq(audioProviderConfigs.provider, definition.id))
    .returning({ id: audioProviderConfigs.id });
  if (!updated.length) {
    await database.insert(audioProviderConfigs).values({
      id: crypto.randomUUID(),
      provider: definition.id,
      apiBaseUrl: definition.defaults.apiBaseUrl,
      defaultModel: definition.defaults.model,
      ...values,
    });
  }
}
