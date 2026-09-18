"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { plans } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";

const createPlanSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    code: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_-]{2,40}$/),
    amount: z.coerce
      .number()
      .positive()
      .max(1_000_000_000)
      .refine((v) => Math.round(v * 100) === v * 100, "Maximum 2 decimals"),
    currency: z.enum(["XOF", "XAF", "NGN", "GHS", "KES", "USD", "EUR"]),
    interval: z.enum(["month", "year"]),
    description: z.string().max(500).default(""),
  })
  .superRefine((value, ctx) => {
    if (
      ["XOF", "XAF"].includes(value.currency) &&
      !Number.isInteger(value.amount)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: `${value.currency} requires a whole-number amount in this starter`,
      });
    }
  });
const toggleSchema = z.object({
  id: z.string().min(1).max(120),
  active: z.enum(["true", "false"]),
});

export async function createPlan(formData: FormData) {
  const session = await requireAdmin();
  const db = getServiceDb();
  const parsed = createPlanSchema.parse(Object.fromEntries(formData));
  const id = randomUUID();
  await db.insert(plans).values({ id, ...parsed, active: true });
  await writeAuditLog({
    action: "plan.created",
    actorId: session.user.id,
    targetType: "plan",
    targetId: id,
    metadata: {
      code: parsed.code,
      amount: parsed.amount,
      currency: parsed.currency,
      interval: parsed.interval,
    },
  });
  revalidatePath("/admin/plans");
  revalidatePath("/dashboard/billing");
}
export async function togglePlan(formData: FormData) {
  const session = await requireAdmin();
  const db = getServiceDb();
  const parsed = toggleSchema.parse(Object.fromEntries(formData));
  const active = parsed.active !== "true";
  await db.update(plans).set({ active }).where(eq(plans.id, parsed.id));
  await writeAuditLog({
    action: "plan.active.changed",
    actorId: session.user.id,
    targetType: "plan",
    targetId: parsed.id,
    metadata: { active },
  });
  revalidatePath("/admin/plans");
  revalidatePath("/dashboard/billing");
}
