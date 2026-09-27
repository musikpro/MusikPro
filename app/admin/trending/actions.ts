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

    const database = getServiceDb();
    const fields = {
      mode: parsed.mode,
      count: parsed.count,
      randomize: parsed.randomize,
      manualSelection: parsed.mode === "manual" ? parsed.manualSelection.slice(0, TRENDING_POOL_SIZE) : [],
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

    return { ok: true, message: "Réglages des tendances enregistrés." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d'enregistrer les réglages des tendances.") };
  }
}
