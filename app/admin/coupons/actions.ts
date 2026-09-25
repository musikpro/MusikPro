"use server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { coupons } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { couponCodeSchema } from "@/lib/validation/coupons";
import { writeAuditLog } from "@/lib/security/audit";

const optionalPositiveInt = z
  .union([z.literal(""), z.coerce.number().int().positive().max(1_000_000)])
  .optional()
  .transform((value) => (value === "" || value == null ? null : value));

const optionalDate = z
  .union([z.literal(""), z.string()])
  .optional()
  .transform((value, context) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      context.addIssue({ code: "custom", message: "Date invalide." });
      return z.NEVER;
    }
    return date;
  });

const couponFormSchema = z
  .object({
    code: couponCodeSchema,
    type: z.enum(["percent", "fixed"]),
    value: z.coerce.number().positive().max(1_000_000_000),
    description: z.string().trim().max(240).default(""),
    active: z.enum(["true", "false"]),
    maxRedemptions: optionalPositiveInt,
    expiresAt: optionalDate,
    sortOrder: z.coerce.number().int().min(0).max(999),
  })
  .refine((data) => data.type !== "percent" || data.value <= 100, {
    message: "Un pourcentage doit être compris entre 1 et 100.",
    path: ["value"],
  });
const idSchema = z.object({ id: z.string().trim().min(1).max(120) });
const toggleSchema = idSchema.extend({ active: z.enum(["true", "false"]) });

function revalidateCoupons() {
  revalidatePath("/admin/coupons");
  revalidatePath("/dashboard/create/pack");
  revalidatePath("/demo/create/pack");
}

function couponValues(parsed: z.infer<typeof couponFormSchema>) {
  return {
    code: parsed.code,
    type: parsed.type,
    value: parsed.value,
    description: parsed.description,
    active: parsed.active === "true",
    maxRedemptions: parsed.maxRedemptions,
    expiresAt: parsed.expiresAt,
    sortOrder: parsed.sortOrder,
  };
}

export async function createCoupon(formData: FormData) {
  const session = await requireAdmin();
  const parsed = couponFormSchema.parse(Object.fromEntries(formData));
  const id = randomUUID();
  await getServiceDb()
    .insert(coupons)
    .values({ id, ...couponValues(parsed) });
  await writeAuditLog({
    action: "coupon.created",
    actorId: session.user.id,
    targetType: "coupon",
    targetId: id,
    metadata: { code: parsed.code, type: parsed.type, value: parsed.value },
  });
  revalidateCoupons();
  redirect("/admin/coupons");
}
export async function updateCoupon(formData: FormData) {
  const session = await requireAdmin();
  const parsed = couponFormSchema.extend({ id: z.string().trim().min(1).max(120) }).parse(Object.fromEntries(formData));
  await getServiceDb()
    .update(coupons)
    .set({ ...couponValues(parsed), updatedAt: new Date() })
    .where(eq(coupons.id, parsed.id));
  await writeAuditLog({
    action: "coupon.updated",
    actorId: session.user.id,
    targetType: "coupon",
    targetId: parsed.id,
    metadata: { code: parsed.code, type: parsed.type, value: parsed.value },
  });
  revalidateCoupons();
  redirect("/admin/coupons");
}
export async function toggleCoupon(formData: FormData) {
  const session = await requireAdmin();
  const parsed = toggleSchema.parse(Object.fromEntries(formData));
  const active = parsed.active !== "true";
  await getServiceDb().update(coupons).set({ active, updatedAt: new Date() }).where(eq(coupons.id, parsed.id));
  await writeAuditLog({
    action: "coupon.active.changed",
    actorId: session.user.id,
    targetType: "coupon",
    targetId: parsed.id,
    metadata: { active },
  });
  revalidateCoupons();
}
export async function deleteCoupon(formData: FormData) {
  const session = await requireAdmin();
  const parsed = idSchema.parse(Object.fromEntries(formData));
  await getServiceDb().delete(coupons).where(eq(coupons.id, parsed.id));
  await writeAuditLog({
    action: "coupon.deleted",
    actorId: session.user.id,
    targetType: "coupon",
    targetId: parsed.id,
  });
  revalidateCoupons();
}
