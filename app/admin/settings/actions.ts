"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { paymentBypassSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";

const paymentBypassSchema = z.object({ enabled: z.boolean() });

/** Owner-only test switch: while enabled, admin accounts can generate without credits or a working payment provider. Paying customer accounts are never affected. */
export async function setPaymentBypass(formData: FormData) {
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
}
