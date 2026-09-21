"use server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceDb } from "@/db";
import { aiProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { createOpenAiClient, getOpenAiProvider } from "@/lib/ai/provider";
import { encryptSecret } from "@/lib/ai/secrets";
import { writeAuditLog } from "@/lib/security/audit";
import { anthropicSettingsSchema, openAiSettingsSchema } from "@/lib/validation/ai";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import { getAnthropicProvider } from "@/lib/ai/provider";

export async function saveOpenAiSettings(formData: FormData) {
  const session = await requireAdmin();
  const parsed = openAiSettingsSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const [current] = await database
    .select()
    .from(aiProviderConfigs)
    .where(eq(aiProviderConfigs.provider, "openai"))
    .limit(1);
  const submittedApiKey = parsed.apiKey || undefined;
  const encrypted = submittedApiKey ? encryptSecret(submittedApiKey) : null;
  const values = {
    enabled: parsed.enabled === "true",
    defaultModel: parsed.defaultModel,
    maxOutputTokens: parsed.maxOutputTokens,
    requestsPerMinute: parsed.requestsPerMinute,
    lyricsGenerationEnabled: parsed.lyricsGenerationEnabled === "true",
    lyricsRewriteEnabled: parsed.lyricsRewriteEnabled === "true",
    isDefaultForLyrics: parsed.isDefaultForLyrics === "true",
    ...(encrypted
      ? {
          apiKeyCiphertext: encrypted.ciphertext,
          apiKeyIv: encrypted.iv,
          apiKeyAuthTag: encrypted.authTag,
          apiKeyLast4: submittedApiKey!.slice(-4),
        }
      : {}),
    updatedAt: new Date(),
  };
  if (values.isDefaultForLyrics)
    await database.update(aiProviderConfigs).set({ isDefaultForLyrics: false });
  if (current) await database.update(aiProviderConfigs).set(values).where(eq(aiProviderConfigs.id, current.id));
  else await database.insert(aiProviderConfigs).values({ id: randomUUID(), provider: "openai", ...values });
  await writeAuditLog({
    action: "ai.openai.settings.updated",
    actorId: session.user.id,
    targetType: "ai_provider",
    targetId: "openai",
    metadata: { enabled: values.enabled, model: values.defaultModel, keyReplaced: Boolean(encrypted) },
  });
  revalidatePath("/admin/ai-providers");
  revalidatePath("/admin/ai-providers/lyrics");
  redirect("/admin/ai-providers/lyrics?saved=1");
}

export async function saveAnthropicSettings(formData: FormData) {
  const session = await requireAdmin();
  const parsed = anthropicSettingsSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const [current] = await database.select().from(aiProviderConfigs).where(eq(aiProviderConfigs.provider, "anthropic")).limit(1);
  const submittedApiKey = parsed.apiKey || undefined;
  const encrypted = submittedApiKey ? encryptSecret(submittedApiKey) : null;
  const values = {
    enabled: parsed.enabled === "true",
    isDefaultForLyrics: parsed.isDefaultForLyrics === "true",
    defaultModel: parsed.defaultModel,
    maxOutputTokens: parsed.maxOutputTokens,
    requestsPerMinute: parsed.requestsPerMinute,
    lyricsGenerationEnabled: parsed.lyricsGenerationEnabled === "true",
    lyricsRewriteEnabled: parsed.lyricsRewriteEnabled === "true",
    ...(encrypted ? { apiKeyCiphertext: encrypted.ciphertext, apiKeyIv: encrypted.iv, apiKeyAuthTag: encrypted.authTag, apiKeyLast4: submittedApiKey!.slice(-4) } : {}),
    updatedAt: new Date(),
  };
  if (values.isDefaultForLyrics) await database.update(aiProviderConfigs).set({ isDefaultForLyrics: false });
  if (current) await database.update(aiProviderConfigs).set(values).where(eq(aiProviderConfigs.id, current.id));
  else await database.insert(aiProviderConfigs).values({ id: randomUUID(), provider: "anthropic", ...values });
  await writeAuditLog({ action: "ai.anthropic.settings.updated", actorId: session.user.id, targetType: "ai_provider", targetId: "anthropic", metadata: { enabled: values.enabled, model: values.defaultModel, keyReplaced: Boolean(encrypted), isDefaultForLyrics: values.isDefaultForLyrics } });
  revalidatePath("/admin/ai-providers");
  revalidatePath("/admin/ai-providers/lyrics");
  redirect("/admin/ai-providers/lyrics/anthropic?saved=1");
}

export async function testAnthropicConnection() {
  const session = await requireAdmin();
  const provider = await getAnthropicProvider();
  if (!provider.apiKey) redirect("/admin/ai-providers/lyrics/anthropic?test=missing");
  try {
    await createAnthropicClient(provider.apiKey).messages.create({ model: provider.model, max_tokens: 16, messages: [{ role: "user", content: "Réponds uniquement OK." }] });
    await writeAuditLog({ action: "ai.anthropic.connection.tested", actorId: session.user.id, targetType: "ai_provider", targetId: "anthropic", metadata: { success: true, model: provider.model } });
  } catch {
    redirect("/admin/ai-providers/lyrics/anthropic?test=failed");
  }
  redirect("/admin/ai-providers/lyrics/anthropic?test=ok");
}

export async function removeAnthropicKey() {
  const session = await requireAdmin();
  await getServiceDb().update(aiProviderConfigs).set({ apiKeyCiphertext: null, apiKeyIv: null, apiKeyAuthTag: null, apiKeyLast4: null, enabled: false, isDefaultForLyrics: false, updatedAt: new Date() }).where(eq(aiProviderConfigs.provider, "anthropic"));
  await writeAuditLog({ action: "ai.anthropic.key.removed", actorId: session.user.id, targetType: "ai_provider", targetId: "anthropic" });
  revalidatePath("/admin/ai-providers");
  revalidatePath("/admin/ai-providers/lyrics");
  redirect("/admin/ai-providers/lyrics/anthropic?removed=1");
}

export async function testOpenAiConnection() {
  const session = await requireAdmin();
  const provider = await getOpenAiProvider();
  if (!provider.apiKey) redirect("/admin/ai-providers/lyrics?test=missing");
  try {
    await createOpenAiClient(provider.apiKey).models.retrieve(provider.model);
    await writeAuditLog({
      action: "ai.openai.connection.tested",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: "openai",
      metadata: { success: true, model: provider.model },
    });
  } catch {
    redirect("/admin/ai-providers/lyrics?test=failed");
  }
  redirect("/admin/ai-providers/lyrics?test=ok");
}

export async function removeOpenAiKey() {
  const session = await requireAdmin();
  await getServiceDb()
    .update(aiProviderConfigs)
    .set({
      apiKeyCiphertext: null,
      apiKeyIv: null,
      apiKeyAuthTag: null,
      apiKeyLast4: null,
      enabled: false,
      updatedAt: new Date(),
    })
    .where(eq(aiProviderConfigs.provider, "openai"));
  await writeAuditLog({
    action: "ai.openai.key.removed",
    actorId: session.user.id,
    targetType: "ai_provider",
    targetId: "openai",
  });
  revalidatePath("/admin/ai-providers");
  revalidatePath("/admin/ai-providers/lyrics");
  redirect("/admin/ai-providers/lyrics?removed=1");
}
