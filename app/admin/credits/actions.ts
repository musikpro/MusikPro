"use server";
import { randomUUID } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { credits, user } from "@/db/schema";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";

const MAX_ADJUSTMENT = 1_000_000;

const creditsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  mode: z.enum(["add", "remove"]).default("add"),
  amount: z.coerce.number().int().min(1).max(MAX_ADJUSTMENT),
});

/**
 * Adds credits to, or removes credits from, a customer's balance. The change is applied as a single
 * atomic SQL increment (never "read, compute, write back"), so it adds to the current balance instead
 * of replacing it and cannot lose a concurrent purchase or generation debit.
 */
export async function adjustCredits(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const db = getServiceDb();
    const parsed = creditsSchema.parse(Object.fromEntries(formData));
    const [target] = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.email, parsed.email))
      .limit(1);
    if (!target) throw new Error("Utilisateur introuvable");

    let newBalance: number;
    if (parsed.mode === "add") {
      const [row] = await db
        .insert(credits)
        .values({ id: randomUUID(), userId: target.id, balance: parsed.amount, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: credits.userId,
          set: { balance: sql`${credits.balance} + ${parsed.amount}`, updatedAt: new Date() },
        })
        .returning({ balance: credits.balance });
      newBalance = Number(row?.balance ?? parsed.amount);
    } else {
      const [row] = await db
        .update(credits)
        .set({ balance: sql`${credits.balance} - ${parsed.amount}`, updatedAt: new Date() })
        .where(and(eq(credits.userId, target.id), gte(credits.balance, parsed.amount)))
        .returning({ balance: credits.balance });
      if (!row) throw new Error("Solde insuffisant pour retirer autant de crédits");
      newBalance = Number(row.balance);
    }

    await writeAuditLog({
      action: parsed.mode === "add" ? "credits.add" : "credits.remove",
      actorId: session.user.id,
      targetType: "user",
      targetId: target.id,
      metadata: { amount: parsed.amount, balance: newBalance },
    });
    revalidatePath("/admin/credits");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/credits");
    const label = parsed.amount > 1 ? "crédits" : "crédit";
    return {
      ok: true,
      message:
        parsed.mode === "add"
          ? `${parsed.amount} ${label} ajouté${parsed.amount > 1 ? "s" : ""} à ${target.email}. Nouveau solde : ${newBalance}.`
          : `${parsed.amount} ${label} retiré${parsed.amount > 1 ? "s" : ""} à ${target.email}. Nouveau solde : ${newBalance}.`,
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier ce solde de crédits.") };
  }
}
