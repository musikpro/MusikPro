"use server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServiceDb } from "@/db";
import { aiProviderConfigs, audioProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { createOpenAiClient, getOpenAiProvider } from "@/lib/ai/provider";
import { encryptSecret } from "@/lib/ai/secrets";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import {
  anthropicSettingsSchema,
  musicfulApiKeyInfoSchema,
  musicfulSettingsSchema,
  openAiSettingsSchema,
} from "@/lib/validation/ai";
import { createAnthropicClient } from "@/lib/ai/anthropic";
import { getAnthropicProvider } from "@/lib/ai/provider";
import { createMusicfulClient, getMusicfulProvider, MusicfulApiError } from "@/lib/ai/musicful";

export type AiProviderActionState = { ok: boolean; message: string } | null;

export async function saveOpenAiSettings(
  _previous: AiProviderActionState,
  formData: FormData,
): Promise<AiProviderActionState> {
  const session = await requireAdmin();
  try {
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
    if (values.isDefaultForLyrics) await database.update(aiProviderConfigs).set({ isDefaultForLyrics: false });
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
    return { ok: true, message: "Réglages OpenAI enregistrés." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer les réglages OpenAI.") };
  }
}

export async function saveAnthropicSettings(
  _previous: AiProviderActionState,
  formData: FormData,
): Promise<AiProviderActionState> {
  const session = await requireAdmin();
  try {
    const parsed = anthropicSettingsSchema.parse(Object.fromEntries(formData));
    const database = getServiceDb();
    const [current] = await database
      .select()
      .from(aiProviderConfigs)
      .where(eq(aiProviderConfigs.provider, "anthropic"))
      .limit(1);
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
    if (values.isDefaultForLyrics) await database.update(aiProviderConfigs).set({ isDefaultForLyrics: false });
    if (current) await database.update(aiProviderConfigs).set(values).where(eq(aiProviderConfigs.id, current.id));
    else await database.insert(aiProviderConfigs).values({ id: randomUUID(), provider: "anthropic", ...values });
    await writeAuditLog({
      action: "ai.anthropic.settings.updated",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: "anthropic",
      metadata: {
        enabled: values.enabled,
        model: values.defaultModel,
        keyReplaced: Boolean(encrypted),
        isDefaultForLyrics: values.isDefaultForLyrics,
      },
    });
    revalidatePath("/admin/ai-providers");
    revalidatePath("/admin/ai-providers/lyrics");
    return { ok: true, message: "Réglages Claude / Anthropic enregistrés." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer les réglages Anthropic.") };
  }
}

export async function testAnthropicConnection(
  _previous: AiProviderActionState,
  _formData: FormData,
): Promise<AiProviderActionState> {
  const session = await requireAdmin();
  const provider = await getAnthropicProvider();
  if (!provider.apiKey) return { ok: false, message: "Aucune clé Anthropic n’est configurée." };
  try {
    await createAnthropicClient(provider.apiKey).messages.create({
      model: provider.model,
      max_tokens: 16,
      messages: [{ role: "user", content: "Réponds uniquement OK." }],
    });
    await writeAuditLog({
      action: "ai.anthropic.connection.tested",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: "anthropic",
      metadata: { success: true, model: provider.model },
    });
    return { ok: true, message: "Connexion Anthropic validée." };
  } catch {
    await writeAuditLog({
      action: "ai.anthropic.connection.tested",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: "anthropic",
      metadata: { success: false },
    });
    return { ok: false, message: "Échec de connexion : vérifie la clé et la disponibilité d’Anthropic." };
  }
}

export async function removeAnthropicKey(
  _previous: AiProviderActionState,
  _formData: FormData,
): Promise<AiProviderActionState> {
  const session = await requireAdmin();
  await getServiceDb()
    .update(aiProviderConfigs)
    .set({
      apiKeyCiphertext: null,
      apiKeyIv: null,
      apiKeyAuthTag: null,
      apiKeyLast4: null,
      enabled: false,
      isDefaultForLyrics: false,
      updatedAt: new Date(),
    })
    .where(eq(aiProviderConfigs.provider, "anthropic"));
  await writeAuditLog({
    action: "ai.anthropic.key.removed",
    actorId: session.user.id,
    targetType: "ai_provider",
    targetId: "anthropic",
  });
  revalidatePath("/admin/ai-providers");
  revalidatePath("/admin/ai-providers/lyrics");
  return { ok: true, message: "Clé Anthropic supprimée." };
}

export async function testOpenAiConnection(
  _previous: AiProviderActionState,
  _formData: FormData,
): Promise<AiProviderActionState> {
  const session = await requireAdmin();
  const provider = await getOpenAiProvider();
  if (!provider.apiKey) return { ok: false, message: "Aucune clé OpenAI n’est configurée." };
  try {
    await createOpenAiClient(provider.apiKey).models.retrieve(provider.model);
    await writeAuditLog({
      action: "ai.openai.connection.tested",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: "openai",
      metadata: { success: true, model: provider.model },
    });
    return { ok: true, message: "Connexion OpenAI validée." };
  } catch {
    await writeAuditLog({
      action: "ai.openai.connection.tested",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: "openai",
      metadata: { success: false },
    });
    return { ok: false, message: "Échec de connexion : vérifie la clé et la disponibilité d’OpenAI." };
  }
}

export async function removeOpenAiKey(
  _previous: AiProviderActionState,
  _formData: FormData,
): Promise<AiProviderActionState> {
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
  return { ok: true, message: "Clé OpenAI supprimée." };
}

export async function saveMusicfulSettings(
  _previous: AiProviderActionState,
  formData: FormData,
): Promise<AiProviderActionState> {
  const session = await requireAdmin();
  try {
    const parsed = musicfulSettingsSchema.parse({
      ...Object.fromEntries(formData),
      allowTextToMusic: formData.get("allowTextToMusic") === "on",
      allowLyricsToMusic: formData.get("allowLyricsToMusic") === "on",
      allowInstrumental: formData.get("allowInstrumental") === "on",
      allowLyricsGenerator: formData.get("allowLyricsGenerator") === "on",
      allowVibe: formData.get("allowVibe") === "on",
      allowWavConversion: formData.get("allowWavConversion") === "on",
      strictStyleAdherence: formData.get("strictStyleAdherence") === "on",
    });
    const database = getServiceDb();
    const [current] = await database
      .select()
      .from(audioProviderConfigs)
      .where(eq(audioProviderConfigs.provider, "musicful"))
      .limit(1);
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
      preferredAudioFormat: parsed.preferredAudioFormat,
      strictStyleAdherence: parsed.strictStyleAdherence,
      maxGenerationsPerUserPerDay: parsed.maxGenerationsPerUserPerDay,
      maxGenerationsPerUserPerHour: parsed.maxGenerationsPerUserPerHour,
      maxConcurrentJobs: parsed.maxConcurrentJobs,
      versionsPerGeneration: parsed.versionsPerGeneration,
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
    if (current) await database.update(audioProviderConfigs).set(values).where(eq(audioProviderConfigs.id, current.id));
    else await database.insert(audioProviderConfigs).values({ id: randomUUID(), provider: "musicful", ...values });
    await writeAuditLog({
      action: "ai.musicful.settings.updated",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: "musicful",
      metadata: {
        enabled: values.enabled,
        model: values.defaultModel,
        keyReplaced: Boolean(encrypted),
        versionsPerGeneration: values.versionsPerGeneration,
      },
    });
    revalidatePath("/admin/ai-providers");
    revalidatePath("/admin/ai-providers/audio");
    return { ok: true, message: "Configuration Musicful enregistrée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer la configuration Musicful.") };
  }
}

export async function testMusicfulConnection(
  _previous: AiProviderActionState,
  _formData: FormData,
): Promise<AiProviderActionState> {
  const session = await requireAdmin();
  const provider = await getMusicfulProvider();
  if (!provider.apiKey) return { ok: false, message: "Aucune clé Musicful n’est disponible." };
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
    revalidatePath("/admin/ai-providers/audio");
    return { ok: true, message: "Connexion Musicful validée." };
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
    revalidatePath("/admin/ai-providers/audio");
    return { ok: false, message: "Échec de connexion : vérifie la clé et la disponibilité de Musicful." };
  }
}

export async function removeMusicfulKey(
  _previous: AiProviderActionState,
  _formData: FormData,
): Promise<AiProviderActionState> {
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
  return { ok: true, message: "Clé Musicful supprimée." };
}
