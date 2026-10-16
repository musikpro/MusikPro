"use server";

import { revalidatePath } from "next/cache";
import { actionErrorMessage } from "@/lib/admin/action-state";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { hasAppRole } from "@/lib/auth/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { saveMaintenance } from "@/lib/maintenance/settings";
import { writeAuditLog } from "@/lib/security/audit";
import { maintenanceFormSchema } from "@/lib/validation/maintenance";

/** Active, met à jour ou désactive le mode maintenance. Réservé au Super Admin ; chaque changement est journalisé. */
export async function setMaintenance(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    if (!hasAppRole((session.user as { role?: string }).role, "admin")) {
      return { ok: false, message: "Seul un Super Admin peut modifier le mode maintenance." };
    }
    const parsed = maintenanceFormSchema.parse({
      enable: String(formData.get("enable") ?? ""),
      message: String(formData.get("message") ?? ""),
    });
    const { wasEnabled } = await saveMaintenance({
      enabled: parsed.enable,
      message: parsed.message,
      actorId: session.user.id,
    });
    const action = !parsed.enable
      ? "maintenance.disabled"
      : wasEnabled
        ? "maintenance.message_updated"
        : "maintenance.enabled";
    await writeAuditLog({
      action,
      actorId: session.user.id,
      targetType: "maintenance_settings",
      targetId: "global",
      metadata: { enabled: parsed.enable, hasMessage: Boolean(parsed.message) },
    });
    revalidatePath("/admin/maintenance");
    return {
      ok: true,
      message: !parsed.enable
        ? "Maintenance désactivée : le site est de nouveau accessible (quelques secondes)."
        : wasEnabled
          ? "Message de maintenance mis à jour."
          : "Maintenance activée : les visiteurs voient la page de maintenance (quelques secondes).",
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier le mode maintenance.") };
  }
}
