"use server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { credits, user } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
const creditsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  balance: z.coerce.number().int().min(0).max(2_000_000_000),
});
export async function setCredits(formData: FormData) {
  const session = await requireAdmin();
  const db = getServiceDb();
  const parsed = creditsSchema.parse(Object.fromEntries(formData));
  const [target] = await db
    .select()
    .from(user)
    .where(eq(user.email, parsed.email))
    .limit(1);
  if (!target) throw new Error("Utilisateur introuvable");
  await db
    .insert(credits)
    .values({
      id: randomUUID(),
      userId: target.id,
      balance: parsed.balance,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: credits.userId,
      set: { balance: parsed.balance, updatedAt: new Date() },
    });
  await writeAuditLog({
    action: "credits.set",
    actorId: session.user.id,
    targetType: "user",
    targetId: target.id,
    metadata: { balance: parsed.balance },
  });
  revalidatePath("/admin/credits");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/credits");
}
