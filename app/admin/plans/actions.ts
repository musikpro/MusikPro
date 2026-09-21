"use server";

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { plans } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { CREDITS_PER_GENERATION } from "@/lib/credit-plans/catalog";
import { writeAuditLog } from "@/lib/security/audit";

const creditPlanFormSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,40}$/),
  amount: z.coerce.number().int().positive().max(1_000_000_000),
  credits: z.coerce.number().int().min(CREDITS_PER_GENERATION).max(100_000),
  description: z.string().trim().max(500).default(""),
  popular: z.enum(["on"]).optional(),
  bonus: z.string().trim().max(120).default(""),
  active: z.enum(["true", "false"]),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

const idSchema = z.object({ id: z.string().trim().min(1).max(120) });
const toggleSchema = idSchema.extend({ active: z.enum(["true", "false"]) });
const reorderSchema = z.object({
  order: z.string().max(30000).transform((value, context) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({ code: "custom", message: "Ordre invalide." });
      return z.NEVER;
    }
  }).pipe(z.array(z.string().trim().min(1).max(120)).min(1).max(200))
    .refine((ids) => new Set(ids).size === ids.length, "Chaque offre doit apparaître une seule fois."),
});

function revalidateCreditPlans() {
  revalidatePath("/admin/plans");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard/credits");
  revalidatePath("/dashboard/create/pack");
}

function planValues(parsed: z.infer<typeof creditPlanFormSchema>) {
  return {
    name: parsed.name,
    code: parsed.code,
    amount: parsed.amount,
    currency: "XOF",
    interval: "one_time",
    description: parsed.description,
    active: parsed.active === "true",
    features: {
      credits: parsed.credits,
      generationCost: CREDITS_PER_GENERATION,
      popular: parsed.popular === "on",
      bonus: parsed.bonus || null,
      sortOrder: parsed.sortOrder,
    },
  };
}

export async function createPlan(formData: FormData) {
  const session = await requireAdmin();
  const parsed = creditPlanFormSchema.parse(Object.fromEntries(formData));
  const id = randomUUID();
  await getServiceDb().insert(plans).values({ id, ...planValues(parsed) });
  await writeAuditLog({
    action: "plan.created",
    actorId: session.user.id,
    targetType: "plan",
    targetId: id,
    metadata: { code: parsed.code, amount: parsed.amount, currency: "XOF", credits: parsed.credits },
  });
  revalidateCreditPlans();
  redirect("/admin/plans");
}

export async function updatePlan(formData: FormData) {
  const session = await requireAdmin();
  const parsed = creditPlanFormSchema.extend({ id: z.string().trim().min(1).max(120) }).parse(Object.fromEntries(formData));
  await getServiceDb().update(plans).set(planValues(parsed)).where(eq(plans.id, parsed.id));
  await writeAuditLog({
    action: "plan.updated",
    actorId: session.user.id,
    targetType: "plan",
    targetId: parsed.id,
    metadata: { code: parsed.code, amount: parsed.amount, currency: "XOF", credits: parsed.credits },
  });
  revalidateCreditPlans();
  redirect("/admin/plans");
}

export async function togglePlan(formData: FormData) {
  const session = await requireAdmin();
  const parsed = toggleSchema.parse(Object.fromEntries(formData));
  const active = parsed.active !== "true";
  await getServiceDb().update(plans).set({ active }).where(eq(plans.id, parsed.id));
  await writeAuditLog({ action: "plan.active.changed", actorId: session.user.id, targetType: "plan", targetId: parsed.id, metadata: { active } });
  revalidateCreditPlans();
}

export async function deletePlan(formData: FormData) {
  const session = await requireAdmin();
  const parsed = idSchema.parse(Object.fromEntries(formData));
  await getServiceDb().delete(plans).where(eq(plans.id, parsed.id));
  await writeAuditLog({ action: "plan.deleted", actorId: session.user.id, targetType: "plan", targetId: parsed.id });
  revalidateCreditPlans();
}

export async function reorderPlans(formData: FormData) {
  const session = await requireAdmin();
  const { order } = reorderSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const rows = await database.select({ id: plans.id, features: plans.features }).from(plans);
  const creditPlanIds = rows.flatMap((row) => {
    if (!row.features || typeof row.features !== "object" || !("credits" in row.features)) return [];
    return [row.id];
  });
  const existingIds = new Set(creditPlanIds);
  if (order.length !== existingIds.size || order.some((id) => !existingIds.has(id))) {
    throw new Error("La liste des offres a changé. Recharge la page avant de recommencer.");
  }
  const orderedRows = JSON.stringify(order.map((id, index) => ({ id, sort_order: (index + 1) * 10 })));
  await database.execute(sql`
    update ${plans}
    set features = jsonb_set(coalesce(${plans.features}, '{}'::jsonb), '{sortOrder}', to_jsonb(ordered.sort_order), true)
    from jsonb_to_recordset(${orderedRows}::jsonb) as ordered(id text, sort_order integer)
    where ${plans.id} = ordered.id
  `);
  await writeAuditLog({ action: "plan.reordered", actorId: session.user.id, targetType: "credit_plan_catalog", targetId: "global", metadata: { order } });
  revalidateCreditPlans();
}
