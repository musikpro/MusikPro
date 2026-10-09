"use server";
import { randomUUID } from "node:crypto";
import { eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { audioProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { encryptSecret } from "@/lib/ai/secrets";
import { getAudioProviderConfig } from "@/lib/ai/musicful";
import { getAudioProviderDefinition, isKnownAudioProviderId } from "@/lib/ai/audio-providers/catalog";
import { getAudioAdapter } from "@/lib/ai/audio-providers/registry";
import { REPLICATE_API_BASE, resolveReplicateVersion } from "@/lib/ai/audio-providers/replicate-model";
import { regenerateAudioWebhookToken } from "@/lib/ai/audio-providers/webhook";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { audioProviderSettingsSchema } from "@/lib/validation/ai";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

const providerIdSchema = z.object({
  provider: z.string().trim().refine(isKnownAudioProviderId, "fournisseur audio inconnu"),
});

function refresh() {
  ["/admin/ai-providers", "/admin/ai-providers/audio", "/admin/settings"].forEach((path) => revalidatePath(path));
}

/** Saves the settings of an audio provider other than Musicful (which has its own dedicated form). */
export async function saveAudioProviderSettings(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = audioProviderSettingsSchema.parse({
      ...Object.fromEntries(formData),
      allowLyricsToMusic: formData.get("allowLyricsToMusic") === "on",
      strictStyleAdherence: formData.get("strictStyleAdherence") === "on",
    });
    const definition = getAudioProviderDefinition(providerIdSchema.parse({ provider: parsed.provider }).provider);
    if (definition.id === "musicful") return { ok: false, message: "Musicful se configure dans son propre onglet." };
    const database = getServiceDb();
    const [current] = await database
      .select()
      .from(audioProviderConfigs)
      .where(eq(audioProviderConfigs.provider, definition.id))
      .limit(1);
    const submittedApiKey = parsed.apiKey || undefined;
    const encrypted = submittedApiKey ? encryptSecret(submittedApiKey) : null;
    const enabled = parsed.enabled === "true";
    if (enabled && !(encrypted || current?.apiKeyCiphertext)) {
      return { ok: false, message: `Ajoute la clé API de ${definition.label} avant de l’activer.` };
    }
    if (enabled && !parsed.apiBaseUrl)
      return { ok: false, message: "Renseigne l’URL de l’API avant d’activer ce fournisseur." };
    const isReplicate = definition.id === "replicate";
    if (isReplicate) {
      // The new key is checked with the free /account call BEFORE it replaces the stored one.
      if (submittedApiKey) {
        const adapter = getAudioAdapter(definition.id);
        try {
          await adapter?.testConnection?.({
            apiKey: submittedApiKey,
            baseUrl: REPLICATE_API_BASE,
            model: definition.defaults.model,
            timeoutMs: 15_000,
            maxRetries: 0,
          });
        } catch {
          return {
            ok: false,
            message: "Clé Replicate refusée : la connexion a échoué, la clé précédente est conservée.",
          };
        }
      }
    }
    const values = {
      enabled,
      // Replicate's host is fixed (the key is only ever sent to api.replicate.com), whatever the form says.
      apiBaseUrl: isReplicate ? definition.defaults.apiBaseUrl : parsed.apiBaseUrl,
      // The Replicate version is never taken from this form: it only changes through the owner-approved
      // activation / rollback flow (lib/ai/audio-providers/replicate-versions.ts).
      defaultModel: isReplicate ? resolveReplicateVersion(current?.defaultModel) : parsed.defaultModel,
      defaultInstrumental: parsed.defaultInstrumental === "true",
      defaultGender: parsed.defaultGender || null,
      requestTimeoutMs: parsed.requestTimeoutMs,
      pollingIntervalMs: parsed.pollingIntervalMs,
      maxPollingMinutes: parsed.maxPollingMinutes,
      maxRetries: parsed.maxRetries,
      allowLyricsToMusic: parsed.allowLyricsToMusic,
      strictStyleAdherence: parsed.strictStyleAdherence,
      maxGenerationsPerUserPerDay: parsed.maxGenerationsPerUserPerDay,
      maxGenerationsPerUserPerHour: parsed.maxGenerationsPerUserPerHour,
      maxConcurrentJobs: parsed.maxConcurrentJobs,
      versionsPerGeneration: parsed.versionsPerGeneration,
      redirectDelaySeconds: parsed.redirectDelaySeconds,
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
    else await database.insert(audioProviderConfigs).values({ id: randomUUID(), provider: definition.id, ...values });
    await writeAuditLog({
      action: "ai.audio_provider.settings.updated",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: definition.id,
      metadata: { enabled, model: values.defaultModel, keyReplaced: Boolean(encrypted) },
    });
    refresh();
    return { ok: true, message: `Configuration ${definition.label} enregistrée.` };
  } catch (error) {
    return {
      ok: false,
      message: actionErrorMessage(error, "Impossible d’enregistrer la configuration du fournisseur."),
    };
  }
}

export async function testAudioProviderConnection(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { provider } = providerIdSchema.parse(Object.fromEntries(formData));
    const definition = getAudioProviderDefinition(provider);
    const adapter = getAudioAdapter(definition.id);
    if (!adapter?.testConnection) {
      return { ok: false, message: `Le test de connexion de ${definition.label} n’est pas encore intégré.` };
    }
    const resolved = await getAudioProviderConfig(definition.id);
    if (!resolved.apiKey) return { ok: false, message: `Aucune clé n’est enregistrée pour ${definition.label}.` };
    const database = getServiceDb();
    try {
      const info = await adapter.testConnection({
        apiKey: resolved.apiKey,
        baseUrl: resolved.baseUrl,
        model: resolved.model,
        timeoutMs: resolved.timeoutMs,
        maxRetries: resolved.maxRetries,
      });
      if (resolved.config) {
        await database
          .update(audioProviderConfigs)
          .set({
            lastConnectionStatus: "connected",
            lastConnectionError: null,
            lastTestedAt: new Date(),
            providerCredits: info.summary ?? null,
            updatedAt: new Date(),
          })
          .where(eq(audioProviderConfigs.id, resolved.config.id));
      }
      await writeAuditLog({
        action: "ai.audio_provider.connection.tested",
        actorId: session.user.id,
        targetType: "ai_provider",
        targetId: definition.id,
        metadata: { success: true },
      });
      refresh();
      return { ok: true, message: `Connexion ${definition.label} validée.` };
    } catch {
      if (resolved.config) {
        await database
          .update(audioProviderConfigs)
          .set({
            lastConnectionStatus: "error",
            lastConnectionError: "connection_failed",
            lastTestedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(audioProviderConfigs.id, resolved.config.id));
      }
      await writeAuditLog({
        action: "ai.audio_provider.connection.tested",
        actorId: session.user.id,
        targetType: "ai_provider",
        targetId: definition.id,
        metadata: { success: false },
      });
      refresh();
      return { ok: false, message: `Échec de connexion : vérifie l’URL et la clé de ${definition.label}.` };
    }
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de tester la connexion.") };
  }
}

export async function removeAudioProviderKey(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { provider } = providerIdSchema.parse(Object.fromEntries(formData));
    const definition = getAudioProviderDefinition(provider);
    const database = getServiceDb();
    const [current] = await database
      .select({ isDefault: audioProviderConfigs.isDefaultForAudio })
      .from(audioProviderConfigs)
      .where(eq(audioProviderConfigs.provider, definition.id))
      .limit(1);
    await database
      .update(audioProviderConfigs)
      .set({
        apiKeyCiphertext: null,
        apiKeyIv: null,
        apiKeyAuthTag: null,
        apiKeyLast4: null,
        enabled: false,
        // A provider without key can no longer receive generations: fall back to Musicful.
        isDefaultForAudio: false,
        lastConnectionStatus: null,
        lastConnectionError: null,
        providerCredits: null,
        updatedAt: new Date(),
      })
      .where(eq(audioProviderConfigs.provider, definition.id));
    if (current?.isDefault) {
      await database
        .update(audioProviderConfigs)
        .set({ isDefaultForAudio: true, updatedAt: new Date() })
        .where(eq(audioProviderConfigs.provider, "musicful"));
    }
    await writeAuditLog({
      action: "ai.audio_provider.key.removed",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: definition.id,
    });
    refresh();
    return { ok: true, message: `Clé ${definition.label} retirée.` };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de retirer la clé.") };
  }
}

/** Chooses the provider that receives new song generations. */
export async function setActiveAudioProvider(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { provider } = providerIdSchema.parse(Object.fromEntries(formData));
    const definition = getAudioProviderDefinition(provider);
    if (!definition.implemented) {
      return {
        ok: false,
        message: `${definition.label} n’est pas encore intégré : ajoute d’abord son adaptateur (lib/ai/audio-providers).`,
      };
    }
    const resolved = await getAudioProviderConfig(definition.id);
    if (!resolved.enabled || !resolved.apiKey) {
      return {
        ok: false,
        message: `Active ${definition.label} et enregistre sa clé API avant d’en faire le fournisseur actif.`,
      };
    }
    const database = getServiceDb();
    if (resolved.config) {
      await database
        .update(audioProviderConfigs)
        .set({ isDefaultForAudio: true, updatedAt: new Date() })
        .where(eq(audioProviderConfigs.id, resolved.config.id));
    } else {
      // Musicful configured through its environment key only: create its row so the choice persists.
      await database.insert(audioProviderConfigs).values({
        id: randomUUID(),
        provider: definition.id,
        enabled: true,
        isDefaultForAudio: true,
        apiBaseUrl: definition.defaults.apiBaseUrl,
        defaultModel: definition.defaults.model,
      });
    }
    await database
      .update(audioProviderConfigs)
      .set({ isDefaultForAudio: false, updatedAt: new Date() })
      .where(ne(audioProviderConfigs.provider, definition.id));
    await writeAuditLog({
      action: "ai.audio_provider.default.set",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: definition.id,
    });
    refresh();
    return { ok: true, message: `${definition.label} reçoit désormais les nouvelles générations.` };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de changer le fournisseur actif.") };
  }
}

/** Creates/replaces the secret token of a provider's webhook URL (the old URL stops working). */
export async function regenerateAudioProviderWebhook(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { provider } = providerIdSchema.parse(Object.fromEntries(formData));
    const definition = getAudioProviderDefinition(provider);
    if (definition.id === "musicful") return { ok: false, message: "Musicful n’utilise pas de webhook." };
    await regenerateAudioWebhookToken(definition.id);
    await writeAuditLog({
      action: "ai.audio_provider.webhook_token.regenerated",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: definition.id,
    });
    refresh();
    return { ok: true, message: `Nouveau lien webhook ${definition.label} généré.` };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de générer le lien webhook.") };
  }
}
