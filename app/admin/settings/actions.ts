"use server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { paymentBypassSettings, audioProviderConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { musicfulAudioFormatEnum } from "@/lib/validation/ai";

const paymentBypassSchema = z.object({ enabled: z.boolean() });

/** Owner-only test switch: while enabled, admin accounts can generate without credits or a working payment provider. Paying customer accounts are never affected. */
export async function setPaymentBypass(formData: FormData) {
  const session = await requireAdmin();
  const parsed = paymentBypassSchema.parse({
    enabled: String(formData.get("enabled") || "") === "on",
  });
  const db = getServiceDb();
  const fields = {
    enabled: parsed.enabled,
    enabledBy: parsed.enabled ? session.user.id : null,
    enabledAt: parsed.enabled ? new Date() : null,
    updatedAt: new Date(),
  };
  await db
    .insert(paymentBypassSettings)
    .values({ id: "global", ...fields })
    .onConflictDoUpdate({ target: paymentBypassSettings.id, set: fields });
  await writeAuditLog({
    action: parsed.enabled ? "payment.bypass.enabled" : "payment.bypass.disabled",
    actorId: session.user.id,
    targetType: "payment_bypass_settings",
    targetId: "global",
    metadata: { enabled: parsed.enabled },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/dashboard", "layout");
}

const audioFormatSchema = z.object({ preferredAudioFormat: musicfulAudioFormatEnum });

/**
 * Controls whether a finished song is always converted to WAV, or left as Musicful's native
 * file (falling back to WAV only when that native file isn't audio-typed at all — see
 * `resolveAudioOnlyUrl` in lib/ai/music-jobs.ts). Shares the same column as the full Musicful
 * settings form (/admin/ai-providers/audio) so both stay in sync automatically.
 */
export async function setPreferredAudioFormat(formData: FormData) {
  const session = await requireAdmin();
  const parsed = audioFormatSchema.parse({ preferredAudioFormat: formData.get("preferredAudioFormat") });
  const db = getServiceDb();
  const fields = { preferredAudioFormat: parsed.preferredAudioFormat, updatedAt: new Date() };
  const [current] = await db
    .select({ id: audioProviderConfigs.id })
    .from(audioProviderConfigs)
    .where(eq(audioProviderConfigs.provider, "musicful"))
    .limit(1);
  if (current) await db.update(audioProviderConfigs).set(fields).where(eq(audioProviderConfigs.id, current.id));
  else await db.insert(audioProviderConfigs).values({ id: randomUUID(), provider: "musicful", ...fields });
  await writeAuditLog({
    action: "ai.musicful.audio_format.updated",
    actorId: session.user.id,
    targetType: "audio_provider_config",
    targetId: "musicful",
    metadata: { preferredAudioFormat: parsed.preferredAudioFormat },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/ai-providers/audio");
}
