"use server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { paymentBypassSettings, audioProviderConfigs, localizationSettings } from "@/db/schema";
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

const countryDetectionSchema = z.object({
  automaticDetectionEnabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  cacheTtlHours: z.coerce.number().int().min(1).max(168),
  fallbackCountryCode: z
    .string()
    .trim()
    .toUpperCase()
    .transform((value) => (value === "" ? null : value))
    .refine((value) => value === null || /^[A-Z]{2}$/.test(value), "Code pays ISO à 2 lettres attendu."),
});

/**
 * Single form covering the whole Country.is detection box (moved here from /admin/languages):
 * on/off, cache TTL (stored in seconds, edited in hours to match country.is's own recommended
 * range) and the fallback country used when detection can't resolve one (IP invalid, API down).
 */
export async function setCountryDetectionSettings(formData: FormData) {
  const session = await requireAdmin();
  const parsed = countryDetectionSchema.parse({
    automaticDetectionEnabled: formData.get("automaticDetectionEnabled") === "true" ? "true" : "false",
    cacheTtlHours: formData.get("cacheTtlHours"),
    fallbackCountryCode: formData.get("fallbackCountryCode") ?? "",
  });
  const fields = {
    automaticDetectionEnabled: parsed.automaticDetectionEnabled,
    countryCacheTtlSeconds: parsed.cacheTtlHours * 3600,
    fallbackCountryCode: parsed.fallbackCountryCode,
    updatedAt: new Date(),
  };
  await getServiceDb()
    .insert(localizationSettings)
    .values({ id: "global", ...fields })
    .onConflictDoUpdate({ target: localizationSettings.id, set: fields });
  await writeAuditLog({
    action: "localization.country_detection.updated",
    actorId: session.user.id,
    targetType: "localization_settings",
    targetId: "global",
    metadata: fields,
  });
  ["/admin/settings", "/admin/languages", "/dashboard", "/dashboard/create/parameters", "/demo"].forEach((path) =>
    revalidatePath(path),
  );
}

export type CountryIsTestResult = { ok: boolean; message: string; timeMs: number };

/** Read-only connectivity check (no state change, no audit log) — mirrors the "Tester" button. */
export async function testCountryIsConnectivity(): Promise<CountryIsTestResult> {
  await requireAdmin();
  const start = Date.now();
  try {
    const response = await fetch("https://api.country.is/", {
      headers: { Accept: "application/json", "User-Agent": "MusikPro/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const timeMs = Date.now() - start;
    if (!response.ok) return { ok: false, message: `Réponse HTTP ${response.status}.`, timeMs };
    const body = (await response.json()) as { country?: unknown; ip?: unknown };
    if (typeof body.country !== "string") return { ok: false, message: "Réponse invalide ou incomplète.", timeMs };
    return { ok: true, message: `API accessible (IP ${String(body.ip ?? "?")} → ${body.country}).`, timeMs };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erreur réseau inconnue.",
      timeMs: Date.now() - start,
    };
  }
}
