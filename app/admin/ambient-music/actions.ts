"use server";
import { revalidatePath } from "next/cache";
import { getServiceDb } from "@/db";
import { ambientBackgroundTrack } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { listSongGroupsForUser } from "@/lib/ai/songs";
import { setAmbientTrackSchema } from "@/lib/validation/ambient-track";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

export async function setAmbientTrack(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = setAmbientTrackSchema.parse({
      songGroupId: formData.get("songGroupId"),
      volumePercent: formData.get("volumePercent"),
    });
    const groups = await listSongGroupsForUser(session.user.id);
    const group = groups.find((g) => g.songGroupId === parsed.songGroupId);
    const primary = group?.versions[0];
    if (!group || !primary?.audioUrl) throw new Error("Cette chanson n'est plus disponible.");
    const db = getServiceDb();
    const fields = {
      enabled: true,
      songGroupId: group.songGroupId,
      jobId: primary.jobId,
      title: group.title,
      audioUrl: primary.audioUrl,
      volumePercent: parsed.volumePercent,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    };
    await db
      .insert(ambientBackgroundTrack)
      .values({ id: "global", ...fields })
      .onConflictDoUpdate({ target: ambientBackgroundTrack.id, set: fields });
    await writeAuditLog({
      action: "ambient_track.updated",
      actorId: session.user.id,
      targetType: "ambient_background_track",
      targetId: "global",
      metadata: { songGroupId: group.songGroupId, volumePercent: parsed.volumePercent },
    });
    revalidatePath("/admin/ambient-music");
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: "Musique d'ambiance mise à jour." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d'enregistrer la musique d'ambiance.") };
  }
}

export async function disableAmbientTrack(_previous: AdminActionState, _formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const db = getServiceDb();
    const fields = { enabled: false, updatedBy: session.user.id, updatedAt: new Date() };
    await db
      .insert(ambientBackgroundTrack)
      .values({ id: "global", ...fields })
      .onConflictDoUpdate({ target: ambientBackgroundTrack.id, set: fields });
    await writeAuditLog({
      action: "ambient_track.disabled",
      actorId: session.user.id,
      targetType: "ambient_background_track",
      targetId: "global",
    });
    revalidatePath("/admin/ambient-music");
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: "Musique d'ambiance désactivée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de désactiver la musique d'ambiance.") };
  }
}
