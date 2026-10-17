"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { actionErrorMessage } from "@/lib/admin/action-state";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { hasAppRole } from "@/lib/auth/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { sendCapiEvents, verifyCapiConnection } from "@/lib/meta-capi/client";
import { buildPageViewEvent } from "@/lib/meta-capi/event";
import {
  META_CAPI_CACHE_TAG,
  readMetaCapiCredentials,
  removeMetaCapiToken,
  saveMetaCapiSettings,
} from "@/lib/meta-capi/settings";
import { writeAuditLog } from "@/lib/security/audit";
import { clientIp } from "@/lib/security/rate-limit";
import { metaCapiFormSchema } from "@/lib/validation/meta-capi";

async function requireSuperAdmin() {
  const session = await requireAdmin();
  if (!hasAppRole((session.user as { role?: string }).role, "admin")) {
    throw new Error("Seul un Super Admin peut gérer l'API Conversions.");
  }
  return session;
}

function refresh() {
  revalidateTag(META_CAPI_CACHE_TAG, { expire: 0 });
  revalidatePath("/admin/tracking-tags");
}

/** Enregistre l'ID du pixel, le token (chiffré ; vide = inchangé), le code de test et l'interrupteur. */
export async function saveMetaCapiAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireSuperAdmin();
    const parsed = metaCapiFormSchema.parse({
      enabled: formData.get("enabled") ? String(formData.get("enabled")) : undefined,
      pixelId: String(formData.get("pixelId") ?? ""),
      token: String(formData.get("token") ?? ""),
      testEventCode: String(formData.get("testEventCode") ?? ""),
    });
    await saveMetaCapiSettings({ ...parsed, actorId: session.user.id });
    await writeAuditLog({
      action: "meta_capi.updated",
      actorId: session.user.id,
      targetType: "meta_capi_settings",
      targetId: "global",
      // Jamais le token : seulement des indicateurs.
      metadata: {
        enabled: parsed.enabled,
        pixelId: parsed.pixelId,
        tokenChanged: Boolean(parsed.token),
        hasTestEventCode: Boolean(parsed.testEventCode),
      },
    });
    refresh();
    return {
      ok: true,
      message: parsed.enabled ? "API Conversions enregistrée et activée." : "API Conversions enregistrée (désactivée).",
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d'enregistrer l'API Conversions.") };
  }
}

export async function removeMetaCapiTokenAction(): Promise<AdminActionState> {
  try {
    const session = await requireSuperAdmin();
    await removeMetaCapiToken(session.user.id);
    await writeAuditLog({
      action: "meta_capi.token_removed",
      actorId: session.user.id,
      targetType: "meta_capi_settings",
      targetId: "global",
    });
    refresh();
    return { ok: true, message: "Token supprimé et API Conversions désactivée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer le token.") };
  }
}

/** Vérifie l'ID du pixel et le token auprès de Meta, sans créer d'événement. */
export async function verifyMetaCapiAction(): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();
    const credentials = await readMetaCapiCredentials({ requireEnabled: false });
    if (!credentials) return { ok: false, message: "Enregistre d'abord l'ID du pixel et le token d'accès." };
    const result = await verifyCapiConnection(credentials);
    if (!result.ok) return { ok: false, message: result.message };
    return {
      ok: true,
      message: result.datasetName
        ? `Connexion valide : jeu de données « ${result.datasetName} ».`
        : "Connexion valide : l'ID du pixel et le token sont acceptés par Meta.",
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de vérifier la connexion.") };
  }
}

/** Envoie un événement « PageView » de test (avec le code de test) : il apparaît dans l'onglet « Tester les événements » de Meta. */
export async function sendMetaCapiTestEventAction(): Promise<AdminActionState> {
  try {
    const session = await requireSuperAdmin();
    const credentials = await readMetaCapiCredentials({ requireEnabled: false });
    if (!credentials) return { ok: false, message: "Enregistre d'abord l'ID du pixel et le token d'accès." };
    if (!credentials.testEventCode) {
      return { ok: false, message: "Renseigne et enregistre le code de test (ex. TEST70629) avant d'envoyer un test." };
    }
    const requestHeaders = await headers();
    const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "https://musikpro.net";
    const event = buildPageViewEvent({
      eventId: `test-${randomUUID()}`,
      url: new URL("/", origin).toString(),
      ip: clientIp(new Request(origin, { headers: requestHeaders })),
      userAgent: requestHeaders.get("user-agent"),
    });
    const result = await sendCapiEvents({
      pixelId: credentials.pixelId,
      token: credentials.token,
      events: [event],
      testEventCode: credentials.testEventCode,
    });
    await writeAuditLog({
      action: "meta_capi.test_event_sent",
      actorId: session.user.id,
      targetType: "meta_capi_settings",
      targetId: "global",
      metadata: { ok: result.ok, eventsReceived: result.ok ? result.eventsReceived : 0 },
    });
    if (!result.ok) return { ok: false, message: result.message };
    return {
      ok: true,
      message: `Événement de test envoyé (${result.eventsReceived} reçu par Meta). Regarde l'onglet « Tester les événements » du Gestionnaire d'événements.`,
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d'envoyer l'événement de test.") };
  }
}
