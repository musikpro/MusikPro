"use server";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { phonePrefixes } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { COUNTRIES_REFERENCE } from "@/lib/languages/countries-reference";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { withAdminNotice } from "@/lib/admin/notice-redirect";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

export type PhonePrefixActionState = AdminActionState;

const createPhonePrefixSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((code) => COUNTRIES_REFERENCE.some((country) => country.code === code), "Pays inconnu."),
  dialCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, "Format attendu : +225"),
  digits: z.coerce.number().int().min(6).max(12),
  placeholder: z.string().trim().regex(/^\d+$/, "Chiffres uniquement."),
  active: z.enum(["true", "false"]),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

const updatePhonePrefixSchema = z.object({
  id: z.string().trim().min(1).max(120),
  dialCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, "Format attendu : +225"),
  digits: z.coerce.number().int().min(6).max(12),
  placeholder: z.string().trim().regex(/^\d+$/, "Chiffres uniquement."),
  active: z.enum(["true", "false"]),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

const prefixMutationSchema = z.object({ id: z.string().trim().min(1).max(120) });
const togglePrefixSchema = prefixMutationSchema.extend({ active: z.enum(["true", "false"]) });
const reorderPrefixesSchema = z.object({
  order: z
    .string()
    .max(30000)
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: "Ordre invalide." });
        return z.NEVER;
      }
    })
    .pipe(z.array(z.string().trim().min(1).max(120)).min(1).max(200))
    .refine((ids) => new Set(ids).size === ids.length, "Chaque préfixe doit apparaître une seule fois."),
});

function checkDigitsMatchPlaceholder(digits: number, placeholder: string) {
  if (placeholder.length !== digits) throw new Error(`L’exemple de numéro doit contenir exactement ${digits} chiffres.`);
}

function revalidatePhonePrefixes() {
  revalidatePath("/admin/phone-prefixes");
  revalidatePath("/dashboard/payment-preview");
}

export async function createPhonePrefix(
  _previous: PhonePrefixActionState,
  formData: FormData,
): Promise<PhonePrefixActionState> {
  const session = await requireAdmin();
  try {
    const parsed = createPhonePrefixSchema.parse(Object.fromEntries(formData));
    checkDigitsMatchPlaceholder(parsed.digits, parsed.placeholder);
    const country = COUNTRIES_REFERENCE.find((entry) => entry.code === parsed.countryCode)!;
    const id = randomUUID();
    await getServiceDb()
      .insert(phonePrefixes)
      .values({
        id,
        countryCode: parsed.countryCode,
        countryName: country.name,
        flag: country.flag,
        dialCode: parsed.dialCode,
        digits: parsed.digits,
        placeholder: parsed.placeholder,
        active: parsed.active === "true",
        sortOrder: parsed.sortOrder,
      });
    await writeAuditLog({
      action: "phone_prefix.created",
      actorId: session.user.id,
      targetType: "phone_prefix",
      targetId: id,
      metadata: { countryCode: parsed.countryCode },
    });
    revalidatePhonePrefixes();
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de créer ce préfixe.") };
  }
  redirect(withAdminNotice("/admin/phone-prefixes", "Préfixe créé.", "success"));
}

export async function updatePhonePrefix(
  _previous: PhonePrefixActionState,
  formData: FormData,
): Promise<PhonePrefixActionState> {
  const session = await requireAdmin();
  try {
    const parsed = updatePhonePrefixSchema.parse(Object.fromEntries(formData));
    checkDigitsMatchPlaceholder(parsed.digits, parsed.placeholder);
    await getServiceDb()
      .update(phonePrefixes)
      .set({
        dialCode: parsed.dialCode,
        digits: parsed.digits,
        placeholder: parsed.placeholder,
        active: parsed.active === "true",
        sortOrder: parsed.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(phonePrefixes.id, parsed.id));
    await writeAuditLog({
      action: "phone_prefix.updated",
      actorId: session.user.id,
      targetType: "phone_prefix",
      targetId: parsed.id,
    });
    revalidatePhonePrefixes();
    return { ok: true, message: "Préfixe enregistré." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer ce préfixe.") };
  }
}

export async function togglePhonePrefix(
  _previous: PhonePrefixActionState,
  formData: FormData,
): Promise<PhonePrefixActionState> {
  const session = await requireAdmin();
  try {
    const parsed = togglePrefixSchema.parse(Object.fromEntries(formData));
    const active = parsed.active !== "true";
    await getServiceDb().update(phonePrefixes).set({ active, updatedAt: new Date() }).where(eq(phonePrefixes.id, parsed.id));
    await writeAuditLog({
      action: "phone_prefix.active.changed",
      actorId: session.user.id,
      targetType: "phone_prefix",
      targetId: parsed.id,
      metadata: { active },
    });
    revalidatePhonePrefixes();
    return { ok: true, message: active ? "Préfixe activé." : "Préfixe désactivé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier ce préfixe.") };
  }
}

export async function deletePhonePrefix(
  _previous: PhonePrefixActionState,
  formData: FormData,
): Promise<PhonePrefixActionState> {
  const session = await requireAdmin();
  try {
    const parsed = prefixMutationSchema.parse(Object.fromEntries(formData));
    await getServiceDb().delete(phonePrefixes).where(eq(phonePrefixes.id, parsed.id));
    await writeAuditLog({
      action: "phone_prefix.deleted",
      actorId: session.user.id,
      targetType: "phone_prefix",
      targetId: parsed.id,
    });
    revalidatePhonePrefixes();
    return { ok: true, message: "Préfixe supprimé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer ce préfixe.") };
  }
}

export async function reorderPhonePrefixes(formData: FormData) {
  const session = await requireAdmin();
  const { order } = reorderPrefixesSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const existing = await database.select({ id: phonePrefixes.id }).from(phonePrefixes);
  const existingIds = new Set(existing.map((row) => row.id));
  if (order.length !== existingIds.size || order.some((id) => !existingIds.has(id)))
    throw new Error("La liste des préfixes a changé. Recharge la page avant de recommencer.");
  const orderedRows = JSON.stringify(order.map((id, index) => ({ id, sort_order: (index + 1) * 10 })));
  await database.execute(
    sql`update ${phonePrefixes} set sort_order = ordered.sort_order, updated_at = now() from jsonb_to_recordset(${orderedRows}::jsonb) as ordered(id text, sort_order integer) where ${phonePrefixes.id} = ordered.id`,
  );
  await writeAuditLog({
    action: "phone_prefix.reordered",
    actorId: session.user.id,
    targetType: "phone_prefix_catalog",
    targetId: "global",
    metadata: { order },
  });
  revalidatePhonePrefixes();
}
