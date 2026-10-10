"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { adminDisplaySettings, paymentBypassSettings, localizationSettings, playbackSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { PLAYBACK_SETTINGS_TAG } from "@/lib/settings/playback";
import {
  GENERATIONS_PER_PAGE_MAX,
  GENERATIONS_PER_PAGE_MIN,
  USERS_PER_PAGE_MAX,
  USERS_PER_PAGE_MIN,
} from "@/lib/settings/admin-display-constants";
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
    [
      "/admin/settings",
      "/admin/languages",
      "/admin/phone-prefixes",
      "/dashboard",
      "/dashboard/create/parameters",
      "/demo",
    ].forEach((path) => revalidatePath(path));
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

const playbackSettingsSchema = z.object({
  exclusivePlaybackEnabled: z.enum(["true", "false"]).transform((value) => value === "true"),
});

/** Réglage global « une seule chanson à la fois » : appliqué à la landing, aux tableaux de bord et à la page publique. */
export async function setExclusivePlayback(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = playbackSettingsSchema.parse({
      exclusivePlaybackEnabled: formData.get("exclusivePlaybackEnabled") === "true" ? "true" : "false",
    });
    const fields = {
      exclusivePlaybackEnabled: parsed.exclusivePlaybackEnabled,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    };
    await getServiceDb()
      .insert(playbackSettings)
      .values({ id: "global", ...fields })
      .onConflictDoUpdate({ target: playbackSettings.id, set: fields });
    await writeAuditLog({
      action: "playback.exclusive.updated",
      actorId: session.user.id,
      targetType: "playback_settings",
      targetId: "global",
      metadata: { exclusivePlaybackEnabled: parsed.exclusivePlaybackEnabled },
    });
    revalidateTag(PLAYBACK_SETTINGS_TAG, { expire: 0 });
    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    return {
      ok: true,
      message: parsed.exclusivePlaybackEnabled
        ? "Lecture exclusive activée : une seule chanson à la fois."
        : "Lecture exclusive désactivée : plusieurs chansons peuvent jouer ensemble.",
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer ce réglage.") };
  }
}

const displayPageSizesSchema = z.object({
  generationsPerPage: z.coerce
    .number({ error: "Nombre invalide." })
    .int("Entier attendu.")
    .min(GENERATIONS_PER_PAGE_MIN, `Minimum ${GENERATIONS_PER_PAGE_MIN} chansons par page.`)
    .max(GENERATIONS_PER_PAGE_MAX, `Maximum ${GENERATIONS_PER_PAGE_MAX} chansons par page.`),
  usersPerPage: z.coerce
    .number({ error: "Nombre invalide." })
    .int("Entier attendu.")
    .min(USERS_PER_PAGE_MIN, `Minimum ${USERS_PER_PAGE_MIN} comptes par page.`)
    .max(USERS_PER_PAGE_MAX, `Maximum ${USERS_PER_PAGE_MAX} comptes par page.`),
});

/** Éléments par page des listes Générations (chansons) et Utilisateurs (comptes) du tableau de bord propriétaire (défaut 50). */
export async function setDisplayPageSizes(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = displayPageSizesSchema.parse({
      generationsPerPage: formData.get("generationsPerPage"),
      usersPerPage: formData.get("usersPerPage"),
    });
    const fields = {
      generationsPerPage: parsed.generationsPerPage,
      usersPerPage: parsed.usersPerPage,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    };
    await getServiceDb()
      .insert(adminDisplaySettings)
      .values({ id: "global", ...fields })
      .onConflictDoUpdate({ target: adminDisplaySettings.id, set: fields });
    await writeAuditLog({
      action: "admin_display.page_sizes.updated",
      actorId: session.user.id,
      targetType: "admin_display_settings",
      targetId: "global",
      metadata: { generationsPerPage: parsed.generationsPerPage, usersPerPage: parsed.usersPerPage },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin/generations");
    revalidatePath("/admin/users");
    return {
      ok: true,
      message: `Affichage : ${parsed.generationsPerPage} chansons et ${parsed.usersPerPage} comptes par page.`,
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer ce réglage.") };
  }
}
