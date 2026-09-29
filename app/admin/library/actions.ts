"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { discoverSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { hideDiscoverSong, restoreDiscoverSong } from "@/lib/discover/server";
import { DISCOVER_MAX_ITEMS_MAX, DISCOVER_MAX_ITEMS_MIN, DISCOVER_SORT_OPTIONS } from "@/lib/discover/types";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

const settingsSchema = z.object({
  enabled: z.enum(["true", "false"]),
  sortBy: z.enum(DISCOVER_SORT_OPTIONS),
  maxItems: z.coerce.number().int().min(DISCOVER_MAX_ITEMS_MIN).max(DISCOVER_MAX_ITEMS_MAX),
});
const songSchema = z.object({ songGroupId: z.string().trim().min(1).max(120) });

function refresh() {
  revalidatePath("/admin/library");
  revalidatePath("/dashboard/discover");
  revalidatePath("/demo/discover");
}

export async function saveDiscoverSettings(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = settingsSchema.parse(Object.fromEntries(formData));
    const values = { enabled: parsed.enabled === "true", sortBy: parsed.sortBy, maxItems: parsed.maxItems };
    await getServiceDb()
      .insert(discoverSettings)
      .values({ id: "global", ...values, updatedBy: session.user.id })
      .onConflictDoUpdate({ target: discoverSettings.id, set: { ...values, updatedBy: session.user.id, updatedAt: new Date() } });
    await writeAuditLog({
      action: "discover.settings.updated",
      actorId: session.user.id,
      targetType: "discover_settings",
      targetId: "global",
      metadata: values,
    });
    refresh();
    return { ok: true, message: "Réglages de la page Découvrir enregistrés." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer les réglages.") };
  }
}

export async function hideSongFromDiscover(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { songGroupId } = songSchema.parse(Object.fromEntries(formData));
    await hideDiscoverSong(songGroupId, "admin");
    await writeAuditLog({
      action: "discover.song.removed",
      actorId: session.user.id,
      targetType: "song_group",
      targetId: songGroupId,
      metadata: { by: "admin" },
    });
    refresh();
    return { ok: true, message: "Chanson retirée de Découvrir." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de retirer cette chanson.") };
  }
}

export async function restoreSongToDiscover(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { songGroupId } = songSchema.parse(Object.fromEntries(formData));
    await restoreDiscoverSong(songGroupId, true);
    await writeAuditLog({
      action: "discover.song.restored",
      actorId: session.user.id,
      targetType: "song_group",
      targetId: songGroupId,
      metadata: { by: "admin" },
    });
    refresh();
    return { ok: true, message: "Chanson remise dans Découvrir." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de remettre cette chanson.") };
  }
}
