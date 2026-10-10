"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import {
  adminDisplaySettings,
  discoverSettings,
  paymentBypassSettings,
  localizationSettings,
  playbackSettings,
  trashSettings,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { PLAYBACK_SETTINGS_TAG } from "@/lib/settings/playback";
import { shareAllAdminSongs } from "@/lib/discover/server";
import { TRASH_RETENTION_MAX_DAYS, TRASH_RETENTION_MIN_DAYS } from "@/lib/trash/retention";
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

const autoShareAdminSongsSchema = z.object({ enabled: z.boolean() });

/** Ajoute (ou non) d'office à Découvrir les chansons générées par les comptes administrateurs. */
export async function setAutoShareAdminSongs(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = autoShareAdminSongsSchema.parse({ enabled: String(formData.get("enabled") || "") === "true" });
    const fields = { autoShareAdminSongs: parsed.enabled, updatedBy: session.user.id, updatedAt: new Date() };
    await getServiceDb()
      .insert(discoverSettings)
      .values({ id: "global", ...fields })
      .onConflictDoUpdate({ target: discoverSettings.id, set: fields });
    await writeAuditLog({
      action: "discover.auto_share_admin_songs.updated",
      actorId: session.user.id,
      targetType: "discover_settings",
      targetId: "global",
      metadata: { enabled: parsed.enabled },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin/library");
    return {
      ok: true,
      message: parsed.enabled
        ? "Les chansons des administrateurs seront ajoutées automatiquement à Découvrir."
        : "Les chansons des administrateurs ne sont plus ajoutées automatiquement à Découvrir.",
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer ce réglage.") };
  }
}
/** Rattrapage : place dans Découvrir toutes les chansons terminées des comptes administrateurs. */
export async function shareAdminSongsToDiscover(): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const added = await shareAllAdminSongs();
    await writeAuditLog({
      action: "discover.admin_songs.bulk_shared",
      actorId: session.user.id,
      targetType: "discover_settings",
      targetId: "global",
      metadata: { added },
    });
    revalidatePath("/admin/generations");
    revalidatePath("/admin/library");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/demo/discover");
    return {
      ok: true,
      message: added
        ? `${added} chanson${added > 1 ? "s" : ""} d’administrateur ajoutée${added > 1 ? "s" : ""} à Découvrir.`
        : "Toutes les chansons des administrateurs sont déjà dans Découvrir.",
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’ajouter les chansons des administrateurs.") };
  }
}

const trashRetentionSchema = z.object({
  songsRetentionDays: z.coerce
    .number({ error: "Nombre invalide." })
    .int("Entier attendu.")
    .min(TRASH_RETENTION_MIN_DAYS, `Minimum ${TRASH_RETENTION_MIN_DAYS} jour.`)
    .max(TRASH_RETENTION_MAX_DAYS, `Maximum ${TRASH_RETENTION_MAX_DAYS} jours.`),
  usersRetentionDays: z.coerce
    .number({ error: "Nombre invalide." })
    .int("Entier attendu.")
    .min(TRASH_RETENTION_MIN_DAYS, `Minimum ${TRASH_RETENTION_MIN_DAYS} jour.`)
    .max(TRASH_RETENTION_MAX_DAYS, `Maximum ${TRASH_RETENTION_MAX_DAYS} jours.`),
});

/** Délai (en jours) avant la suppression automatique des chansons et des comptes qui sont dans la corbeille. */
export async function setTrashRetention(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = trashRetentionSchema.parse({
      songsRetentionDays: formData.get("songsRetentionDays"),
      usersRetentionDays: formData.get("usersRetentionDays"),
    });
    const fields = { ...parsed, updatedBy: session.user.id, updatedAt: new Date() };
    await getServiceDb()
      .insert(trashSettings)
      .values({ id: "global", ...fields })
      .onConflictDoUpdate({ target: trashSettings.id, set: fields });
    await writeAuditLog({
      action: "trash.retention.updated",
      actorId: session.user.id,
      targetType: "trash_settings",
      targetId: "global",
      metadata: parsed,
    });
    revalidatePath("/admin/settings");
    revalidatePath("/admin/corbeille");
    return {
      ok: true,
      message: `Corbeille : chansons conservées ${parsed.songsRetentionDays} jours, comptes ${parsed.usersRetentionDays} jours.`,
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer ce réglage.") };
  }
}
