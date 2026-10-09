"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { trendingSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { writeAuditLog } from "@/lib/security/audit";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { TRENDING_POOL_SIZE } from "@/lib/trending/types";
import { songAlreadyUsedMessage } from "@/lib/featured-songs/placements";
import { getLandingSongPlacements } from "@/lib/featured-songs/server";
import { getTrendingSettings } from "@/lib/trending/settings";
import { getGeneratedSongOptionById } from "@/lib/trending/admin";
import { publishSongGroup } from "@/lib/ai/songs";

const coverUrlSchema = z.union([z.literal(""), z.string().url().max(2048)]);

// Une carte = une chanson + sa pochette (chargée depuis la page Médias). Les deux listes sont alignées par index.
const setTrendingSettingsSchema = z.object({
  manualSelection: z.array(z.string().min(1)).max(TRENDING_POOL_SIZE, `Deux chansons au maximum.`),
  covers: z.array(coverUrlSchema).max(TRENDING_POOL_SIZE),
});

export async function setTrendingSettings(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = setTrendingSettingsSchema.parse({
      manualSelection: formData.getAll("manualSelection").map(String),
      covers: formData.getAll("cover").map(String),
    });
    if (new Set(parsed.manualSelection).size !== parsed.manualSelection.length) {
      throw new Error("Une même chanson ne peut pas occuper deux cartes.");
    }

    // Une chanson déjà mise en avant sur la landing (« Ils ont créé avec MusikPro », « Bibliothèque
    // populaire ») ne peut pas aussi figurer dans Tendances. Seules les chansons ajoutées par cet
    // enregistrement sont refusées : une chanson déjà présente avant (données plus anciennes) reste modifiable.
    const alreadySaved = new Set((await getTrendingSettings()).manualSelection);
    const newlyAdded = parsed.manualSelection.filter((songGroupId) => !alreadySaved.has(songGroupId));
    if (newlyAdded.length) {
      const landingPlacements = await getLandingSongPlacements();
      const conflict = newlyAdded.find((songGroupId) => landingPlacements[songGroupId]);
      if (conflict) return { ok: false, message: songAlreadyUsedMessage(landingPlacements[conflict]) };
    }

    // Manual picks can now come from ANY completed generation, published or not (see
    // lib/trending/admin.ts's listRecentGeneratedSongsForAdmin) — the client-facing "Tendances"
    // widget still only knows how to link to a published /s/[slug] page, so publish (idempotent,
    // no-op if already published) whatever the admin picked here. A stale/invalid ID (e.g. the
    // song was deleted since) is dropped rather than failing the whole save.
    const candidates = parsed.manualSelection.slice(0, TRENDING_POOL_SIZE);
    const resolved = await Promise.all(
      candidates.map(async (songGroupId, index) => {
        const option = await getGeneratedSongOptionById(songGroupId);
        if (!option) return null;
        try {
          await publishSongGroup(option.userId, option.songGroupId, option.jobId);
          return { songGroupId, cover: parsed.covers[index] ?? "" };
        } catch {
          return null;
        }
      }),
    );
    const kept = resolved.filter((entry): entry is { songGroupId: string; cover: string } => Boolean(entry));
    const manualSelection = kept.map((entry) => entry.songGroupId);
    const coverOverrides = Object.fromEntries(
      kept.filter((entry) => entry.cover).map((entry) => [entry.songGroupId, entry.cover]),
    );
    const droppedCount = candidates.length - kept.length;

    const database = getServiceDb();
    const fields = {
      mode: "manual",
      count: TRENDING_POOL_SIZE,
      randomize: false,
      manualSelection,
      coverOverrides,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    };
    await database
      .insert(trendingSettings)
      .values({ id: "global", ...fields })
      .onConflictDoUpdate({ target: trendingSettings.id, set: fields });

    await writeAuditLog({
      action: "trending_settings.updated",
      actorId: session.user.id,
      targetType: "trending_settings",
      targetId: "global",
      metadata: { manualSelection, coverOverrides },
    });

    revalidatePath("/admin/trending");
    revalidatePath("/dashboard", "layout");

    return {
      ok: true,
      message:
        droppedCount > 0
          ? `Réglages des tendances enregistrés (${droppedCount} identifiant${droppedCount > 1 ? "s" : ""} introuvable${droppedCount > 1 ? "s" : ""} ignoré${droppedCount > 1 ? "s" : ""}).`
          : "Réglages des tendances enregistrés.",
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d'enregistrer les réglages des tendances.") };
  }
}
