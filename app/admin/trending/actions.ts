"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { trendingSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { writeAuditLog } from "@/lib/security/audit";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { TRENDING_COUNT_OPTIONS, TRENDING_POOL_SIZE } from "@/lib/trending/types";
import { getGeneratedSongOptionById } from "@/lib/trending/admin";
import { publishSongGroup } from "@/lib/ai/songs";

const setTrendingSettingsSchema = z.object({
  mode: z.enum(["auto", "manual"]),
  count: z.coerce.number().refine((value) => (TRENDING_COUNT_OPTIONS as readonly number[]).includes(value), {
    message: "Choisis 2 ou 3 tendances.",
  }),
  randomize: z.enum(["true", "false"]).transform((value) => value === "true"),
  manualSelection: z.array(z.string().min(1)).max(TRENDING_POOL_SIZE),
});

export async function setTrendingSettings(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = setTrendingSettingsSchema.parse({
      mode: formData.get("mode"),
      count: formData.get("count"),
      randomize: formData.get("randomize"),
      manualSelection: formData.getAll("manualSelection").map(String).filter(Boolean),
    });

    // Manual picks can now come from ANY completed generation, published or not (see
    // lib/trending/admin.ts's listRecentGeneratedSongsForAdmin) — the client-facing "Tendances"
    // widget still only knows how to link to a published /s/[slug] page, so publish (idempotent,
    // no-op if already published) whatever the admin picked here. A stale/invalid ID (e.g. the
    // song was deleted since) is dropped rather than failing the whole save.
    let manualSelection: string[] = [];
    let droppedCount = 0;
    if (parsed.mode === "manual") {
      const candidates = parsed.manualSelection.slice(0, TRENDING_POOL_SIZE);
      const resolved = await Promise.all(
        candidates.map(async (songGroupId) => {
          const option = await getGeneratedSongOptionById(songGroupId);
          if (!option) return null;
          try {
            await publishSongGroup(option.userId, option.songGroupId, option.jobId);
            return songGroupId;
          } catch {
            return null;
          }
        }),
      );
      manualSelection = resolved.filter((id): id is string => Boolean(id));
      droppedCount = candidates.length - manualSelection.length;
    }

    const database = getServiceDb();
    const fields = {
      mode: parsed.mode,
      count: parsed.count,
      randomize: parsed.randomize,
      manualSelection,
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
      metadata: { mode: parsed.mode, count: parsed.count, randomize: parsed.randomize, manualSelection: fields.manualSelection },
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
