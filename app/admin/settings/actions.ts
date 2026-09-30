"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { paymentBypassSettings, localizationSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

const paymentBypassSchema = z.object({ enabled: z.boolean() });

/** Owner-only test switch: while enabled, admin accounts can generate without credits or a working payment provider. Paying customer accounts are never affected. */
export async function setPaymentBypass(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
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
    return { ok: true, message: parsed.enabled ? "Mode test activé." : "Mode test désactivé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier le mode test.") };
  }
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
export async function setCountryDetectionSettings(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
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
    return { ok: true, message: "Réglages de détection du pays enregistrés." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer ces réglages.") };
  }
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
