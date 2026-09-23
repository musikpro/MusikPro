"use server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceDb } from "@/db";
import { aiProviderConfigs, audioProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { createOpenAiClient, getOpenAiProvider } from "@/lib/ai/provider";
import { encryptSecret } from "@/lib/ai/secrets";
import { writeAuditLog } from "@/lib/security/audit";
import { anthropicSettingsSchema, musicfulApiKeyInfoSchema, musicfulSettingsSchema, openAiSettingsSchema } from "@/lib/validation/ai";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import { getAnthropicProvider } from "@/lib/ai/provider";
import { createMusicfulClient, getMusicfulProvider, MusicfulApiError } from "@/lib/ai/musicful";

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

export async function saveMusicfulSettings(formData: FormData) {
  const session = await requireAdmin();
  const parsed = musicfulSettingsSchema.parse({
    ...Object.fromEntries(formData),
    allowTextToMusic: formData.get("allowTextToMusic") === "on",
    allowLyricsToMusic: formData.get("allowLyricsToMusic") === "on",
    allowInstrumental: formData.get("allowInstrumental") === "on",
    allowLyricsGenerator: formData.get("allowLyricsGenerator") === "on",
    allowVibe: formData.get("allowVibe") === "on",
    allowWavConversion: formData.get("allowWavConversion") === "on",
    allowMp4Conversion: formData.get("allowMp4Conversion") === "on",
    strictStyleAdherence: formData.get("strictStyleAdherence") === "on",
  });
  const database = getServiceDb();
  const [current] = await database.select().from(audioProviderConfigs).where(eq(audioProviderConfigs.provider, "musicful")).limit(1);
  const submittedApiKey = parsed.apiKey || undefined;
  const encrypted = submittedApiKey ? encryptSecret(submittedApiKey) : null;
  const hasKey = Boolean(encrypted || current?.apiKeyCiphertext);
  const enabled = parsed.enabled === "true";
  if (enabled && !hasKey) throw new Error("Ajoute la clé API Musicful avant d'activer ce fournisseur.");
  const values = {
    enabled,
    defaultModel: parsed.defaultModel,
    defaultInstrumental: parsed.defaultInstrumental === "true",
    defaultGender: parsed.defaultGender || null,
    requestTimeoutMs: parsed.requestTimeoutMs,
    pollingIntervalMs: parsed.pollingIntervalMs,
    maxPollingMinutes: parsed.maxPollingMinutes,
    maxRetries: parsed.maxRetries,
    allowTextToMusic: parsed.allowTextToMusic,
    allowLyricsToMusic: parsed.allowLyricsToMusic,
    allowInstrumental: parsed.allowInstrumental,
    allowLyricsGenerator: parsed.allowLyricsGenerator,
    allowVibe: parsed.allowVibe,
    allowWavConversion: parsed.allowWavConversion,
    allowMp4Conversion: parsed.allowMp4Conversion,
    preferredAudioFormat: parsed.preferredAudioFormat,
    strictStyleAdherence: parsed.strictStyleAdherence,
    maxGenerationsPerUserPerDay: parsed.maxGenerationsPerUserPerDay,
    maxGenerationsPerUserPerHour: parsed.maxGenerationsPerUserPerHour,
    maxConcurrentJobs: parsed.maxConcurrentJobs,
    ...(encrypted
      ? { apiKeyCiphertext: encrypted.ciphertext, apiKeyIv: encrypted.iv, apiKeyAuthTag: encrypted.authTag, apiKeyLast4: submittedApiKey!.slice(-4) }
      : {}),
    updatedAt: new Date(),
  };
  if (current) await database.update(audioProviderConfigs).set(values).where(eq(audioProviderConfigs.id, current.id));
  else await database.insert(audioProviderConfigs).values({ id: randomUUID(), provider: "musicful", ...values });
  await writeAuditLog({
    action: "ai.musicful.settings.updated",
    actorId: session.user.id,
    targetType: "ai_provider",
    targetId: "musicful",
    metadata: { enabled: values.enabled, model: values.defaultModel, keyReplaced: Boolean(encrypted) },
  });
  revalidatePath("/admin/ai-providers");
  revalidatePath("/admin/ai-providers/audio");
  redirect("/admin/ai-providers/audio?saved=1");
}

export async function testMusicfulConnection() {
  const session = await requireAdmin();
  const provider = await getMusicfulProvider();
  if (!provider.apiKey) redirect("/admin/ai-providers/audio?test=missing");
  const database = getServiceDb();
  try {
    const client = createMusicfulClient(provider.apiKey, provider.baseUrl, provider.timeoutMs);
    const info = musicfulApiKeyInfoSchema.parse(await client.getApiKeyInfo());
    if (provider.config) {
      await database
        .update(audioProviderConfigs)
        .set({
          lastConnectionStatus: "connected",
          lastConnectionError: null,
          lastTestedAt: new Date(),
          providerKeyStatus: info.key_status,
          providerCredits: String(info.key_music_counts),
          providerEmail: info.email ?? null,
          providerMemberId: info.member_id ?? null,
          providerKeyName: info.key_name ?? null,
          providerKeyCreatedAt: info.key_created_at ?? null,
          providerLastUsedAt: info.key_recently_used_at ?? null,
          updatedAt: new Date(),
        })
        .where(eq(audioProviderConfigs.id, provider.config.id));
    }
    await writeAuditLog({
      action: "ai.musicful.connection.tested",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: "musicful",
      metadata: { success: true, keyStatus: info.key_status },
    });
  } catch (error) {
    if (provider.config) {
      await database
        .update(audioProviderConfigs)
        .set({
          lastConnectionStatus: "error",
          lastConnectionError: error instanceof MusicfulApiError ? `HTTP ${error.status}` : "connection_failed",
          lastTestedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(audioProviderConfigs.id, provider.config.id));
    }
    await writeAuditLog({
      action: "ai.musicful.connection.tested",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: "musicful",
      metadata: { success: false },
    });
    redirect("/admin/ai-providers/audio?test=failed");
  }
  revalidatePath("/admin/ai-providers/audio");
  redirect("/admin/ai-providers/audio?test=ok");
}

export async function removeMusicfulKey() {
  const session = await requireAdmin();
  await getServiceDb()
    .update(audioProviderConfigs)
    .set({
      apiKeyCiphertext: null,
      apiKeyIv: null,
      apiKeyAuthTag: null,
      apiKeyLast4: null,
      enabled: false,
      lastConnectionStatus: null,
      lastConnectionError: null,
      providerKeyStatus: null,
      providerCredits: null,
      providerEmail: null,
      providerMemberId: null,
      providerKeyName: null,
      providerKeyCreatedAt: null,
      providerLastUsedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(audioProviderConfigs.provider, "musicful"));
  await writeAuditLog({
    action: "ai.musicful.key.removed",
    actorId: session.user.id,
    targetType: "ai_provider",
    targetId: "musicful",
  });
  revalidatePath("/admin/ai-providers");
  revalidatePath("/admin/ai-providers/audio");
  redirect("/admin/ai-providers/audio?removed=1");
}
