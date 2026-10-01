"use server";
import { revalidatePath } from "next/cache";
import { getServiceDb } from "@/db";
import { mobileStoreLinks } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { setStoreLinksSchema } from "@/lib/validation/store-links";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

export async function setStoreLinks(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = setStoreLinksSchema.parse({
      googlePlayUrl: formData.get("googlePlayUrl"),
      appStoreUrl: formData.get("appStoreUrl"),
      hideInApp: formData.get("hideInApp"),
    });
    const db = getServiceDb();
    const fields = {
      googlePlayUrl: parsed.googlePlayUrl || null,
      appStoreUrl: parsed.appStoreUrl || null,
      hideInApp: parsed.hideInApp,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    };
    await db
      .insert(mobileStoreLinks)
      .values({ id: "global", ...fields })
      .onConflictDoUpdate({ target: mobileStoreLinks.id, set: fields });
    await writeAuditLog({
      action: "mobile_store_links.updated",
      actorId: session.user.id,
      targetType: "mobile_store_links",
      targetId: "global",
      metadata: { googlePlayUrl: fields.googlePlayUrl, appStoreUrl: fields.appStoreUrl, hideInApp: fields.hideInApp },
    });
    revalidatePath("/admin/mobile-apps");
    revalidatePath("/dashboard", "layout");
    return { ok: true, message: "Liens des stores mis à jour." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d'enregistrer les liens des stores.") };
  }
}
