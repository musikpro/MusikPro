"use server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServiceDb } from "@/db";
import { aiProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { encryptSecret } from "@/lib/ai/secrets";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { anthropicAdminKeySettingsSchema } from "@/lib/validation/ai";

export type AiCreditsActionState = { ok: boolean; message: string } | null;

export async function saveAnthropicAdminKey(
  _previous: AiCreditsActionState,
  formData: FormData,
): Promise<AiCreditsActionState> {
  const session = await requireAdmin();
  try {
    const parsed = anthropicAdminKeySettingsSchema.parse(Object.fromEntries(formData));
    const submittedKey = parsed.adminApiKey || undefined;
    if (!submittedKey) return { ok: false, message: "Colle une Admin API Key Anthropic avant d’enregistrer." };
    const encrypted = encryptSecret(submittedKey);
    const database = getServiceDb();
    const [current] = await database
      .select({ id: aiProviderConfigs.id })
      .from(aiProviderConfigs)
      .where(eq(aiProviderConfigs.provider, "anthropic"))
      .limit(1);
    const values = {
      adminApiKeyCiphertext: encrypted.ciphertext,
      adminApiKeyIv: encrypted.iv,
      adminApiKeyAuthTag: encrypted.authTag,
      adminApiKeyLast4: submittedKey.slice(-4),
      updatedAt: new Date(),
    };
    if (current) await database.update(aiProviderConfigs).set(values).where(eq(aiProviderConfigs.id, current.id));
    else
      await database.insert(aiProviderConfigs).values({
        id: randomUUID(),
        provider: "anthropic",
        enabled: false,
        ...values,
      });
    await writeAuditLog({
      action: "ai.anthropic.admin_key.updated",
      actorId: session.user.id,
      targetType: "ai_provider",
      targetId: "anthropic",
    });
    revalidatePath("/admin/ai-credits");
    return { ok: true, message: "Admin API Key Anthropic enregistrée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer cette Admin API Key.") };
  }
}

export async function removeAnthropicAdminKey(
  _previous: AiCreditsActionState,
  _formData: FormData,
): Promise<AiCreditsActionState> {
  const session = await requireAdmin();
  await getServiceDb()
    .update(aiProviderConfigs)
    .set({
      adminApiKeyCiphertext: null,
      adminApiKeyIv: null,
      adminApiKeyAuthTag: null,
      adminApiKeyLast4: null,
      updatedAt: new Date(),
    })
    .where(eq(aiProviderConfigs.provider, "anthropic"));
  await writeAuditLog({
    action: "ai.anthropic.admin_key.removed",
    actorId: session.user.id,
    targetType: "ai_provider",
    targetId: "anthropic",
  });
  revalidatePath("/admin/ai-credits");
  return { ok: true, message: "Admin API Key Anthropic supprimée." };
}
