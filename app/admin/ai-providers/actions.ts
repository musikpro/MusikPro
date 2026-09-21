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
import { openAiSettingsSchema } from "@/lib/validation/ai";

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
