"use server";

import { randomUUID } from "node:crypto";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { occasionFields, occasions } from "@/db/schema";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { withAdminNotice } from "@/lib/admin/notice-redirect";
import { requireAdmin } from "@/lib/auth/session";
import { proposalToFormInput, type FieldProposal } from "@/lib/occasion-fields/ai-schema";
import { occasionFieldFormSchema, slugifyFieldKey } from "@/lib/occasion-fields/form-schema";
import { MAX_ACTIVE_FIELDS_PER_OCCASION } from "@/lib/occasion-fields/types";
import { writeAuditLog } from "@/lib/security/audit";

const idSchema = z.object({ id: z.string().trim().min(1).max(120) });
const blocksSchema = z.object({
  occasionId: z.string().trim().min(1).max(120),
  showRecipient: z.enum(["true", "false"]),
  showSender: z.enum(["true", "false"]),
  titleFieldId: z.string().trim().max(120).default(""),
});
const toggleSchema = idSchema.extend({ active: z.enum(["true", "false"]) });
const duplicateSchema = idSchema.extend({ targetOccasionId: z.string().trim().min(1).max(120) });
const reorderSchema = z.object({
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
    .pipe(z.array(z.string().trim().min(1).max(120)).min(1).max(50))
    .refine((ids) => new Set(ids).size === ids.length, "Chaque champ doit apparaître une seule fois."),
});

function revalidateOccasionFields(occasionId?: string) {
  revalidatePath("/admin/occasion-fields");
  if (occasionId) revalidatePath(`/admin/occasion-fields/${occasionId}`);
  revalidatePath("/dashboard/create/recipient");
  revalidatePath("/demo/create/recipient");
}

async function assertRoomForActiveField(occasionId: string, excludeFieldId?: string) {
  const [row] = await getServiceDb()
    .select({ total: count() })
    .from(occasionFields)
    .where(
      and(
        eq(occasionFields.occasionId, occasionId),
        eq(occasionFields.active, true),
        excludeFieldId ? sql`${occasionFields.id} <> ${excludeFieldId}` : undefined,
      ),
    );
  if ((row?.total ?? 0) >= MAX_ACTIVE_FIELDS_PER_OCCASION)
    throw new Error(`Une occasion ne peut avoir que ${MAX_ACTIVE_FIELDS_PER_OCCASION} champs actifs.`);
}

async function uniqueKey(occasionId: string, label: string) {
  const base = slugifyFieldKey(label);
  const existing = await getServiceDb()
    .select({ key: occasionFields.key })
    .from(occasionFields)
    .where(eq(occasionFields.occasionId, occasionId));
  const taken = new Set(existing.map((row) => row.key));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 100; n += 1) if (!taken.has(`${base}_${n}`)) return `${base}_${n}`;
  throw new Error("Impossible de générer un identifiant unique pour ce champ.");
}

export async function updateOccasionBlocks(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const parsed = blocksSchema.parse(Object.fromEntries(formData));
    if (parsed.titleFieldId) {
      const [field] = await getServiceDb()
        .select({ id: occasionFields.id })
        .from(occasionFields)
        .where(and(eq(occasionFields.id, parsed.titleFieldId), eq(occasionFields.occasionId, parsed.occasionId)))
        .limit(1);
      if (!field) throw new Error("Le champ du titre n’appartient pas à cette occasion.");
    }
    await getServiceDb()
      .update(occasions)
      .set({
        showRecipient: parsed.showRecipient === "true",
        showSender: parsed.showSender === "true",
        titleFieldId: parsed.titleFieldId || null,
        updatedAt: new Date(),
      })
      .where(eq(occasions.id, parsed.occasionId));
    await writeAuditLog({
      action: "occasion_fields.blocks.updated",
      actorId: session.user.id,
      targetType: "occasion",
      targetId: parsed.occasionId,
      metadata: { showRecipient: parsed.showRecipient, showSender: parsed.showSender, titleFieldId: parsed.titleFieldId },
    });
    revalidateOccasionFields(parsed.occasionId);
    return { ok: true, message: "Blocs intégrés enregistrés." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer les blocs intégrés.") };
  }
}

export async function createOccasionField(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  let occasionId = "";
  try {
    const parsed = occasionFieldFormSchema.parse(Object.fromEntries(formData));
    occasionId = parsed.occasionId;
    if (parsed.active === "true") await assertRoomForActiveField(occasionId);
    const id = randomUUID();
    await getServiceDb()
      .insert(occasionFields)
      .values({
        id,
        occasionId,
        key: await uniqueKey(occasionId, parsed.label),
        label: parsed.label,
        helpText: parsed.helpText,
        icon: parsed.icon,
        placeholder: parsed.placeholder,
        type: parsed.type,
        options: parsed.options,
        config: parsed.config,
        required: parsed.required === "true",
        aiHint: parsed.aiHint,
        sortOrder: parsed.sortOrder,
        active: parsed.active === "true",
      });
    await writeAuditLog({
      action: "occasion_field.created",
      actorId: session.user.id,
      targetType: "occasion_field",
      targetId: id,
      metadata: { occasionId, label: parsed.label, type: parsed.type },
    });
    revalidateOccasionFields(occasionId);
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de créer ce champ.") };
  }
  redirect(withAdminNotice(`/admin/occasion-fields/${occasionId}`, "Champ créé."));
}

export async function updateOccasionField(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const { id } = idSchema.parse(Object.fromEntries(formData));
    const parsed = occasionFieldFormSchema.parse(Object.fromEntries(formData));
    if (parsed.active === "true") await assertRoomForActiveField(parsed.occasionId, id);
    await getServiceDb()
      .update(occasionFields)
      .set({
        label: parsed.label,
        helpText: parsed.helpText,
        icon: parsed.icon,
        placeholder: parsed.placeholder,
        type: parsed.type,
        options: parsed.options,
        config: parsed.config,
        required: parsed.required === "true",
        aiHint: parsed.aiHint,
        sortOrder: parsed.sortOrder,
        active: parsed.active === "true",
        updatedAt: new Date(),
      })
      .where(and(eq(occasionFields.id, id), eq(occasionFields.occasionId, parsed.occasionId)));
    await writeAuditLog({
      action: "occasion_field.updated",
      actorId: session.user.id,
      targetType: "occasion_field",
      targetId: id,
      metadata: { label: parsed.label, type: parsed.type },
    });
    revalidateOccasionFields(parsed.occasionId);
    return { ok: true, message: "Champ enregistré." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer ce champ.") };
  }
}

export async function toggleOccasionField(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const parsed = toggleSchema.parse(Object.fromEntries(formData));
    const active = parsed.active !== "true"; // le formulaire envoie l'état actuel
    const [field] = await getServiceDb()
      .select({ occasionId: occasionFields.occasionId })
      .from(occasionFields)
      .where(eq(occasionFields.id, parsed.id))
      .limit(1);
    if (!field) throw new Error("Champ introuvable.");
    if (active) await assertRoomForActiveField(field.occasionId, parsed.id);
    await getServiceDb()
      .update(occasionFields)
      .set({ active, updatedAt: new Date() })
      .where(eq(occasionFields.id, parsed.id));
    await writeAuditLog({
      action: "occasion_field.active.changed",
      actorId: session.user.id,
      targetType: "occasion_field",
      targetId: parsed.id,
      metadata: { active },
    });
    revalidateOccasionFields(field.occasionId);
    return { ok: true, message: active ? "Champ activé." : "Champ désactivé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier ce champ.") };
  }
}

export async function deleteOccasionField(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const { id } = idSchema.parse(Object.fromEntries(formData));
    const database = getServiceDb();
    const [field] = await database
      .select({ occasionId: occasionFields.occasionId })
      .from(occasionFields)
      .where(eq(occasionFields.id, id))
      .limit(1);
    // Un champ supprimé ne doit pas rester le « champ du titre » d'une occasion.
    await database.update(occasions).set({ titleFieldId: null }).where(eq(occasions.titleFieldId, id));
    await database.delete(occasionFields).where(eq(occasionFields.id, id));
    await writeAuditLog({
      action: "occasion_field.deleted",
      actorId: session.user.id,
      targetType: "occasion_field",
      targetId: id,
    });
    revalidateOccasionFields(field?.occasionId);
    return { ok: true, message: "Champ supprimé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer ce champ.") };
  }
}

export async function duplicateOccasionField(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const parsed = duplicateSchema.parse(Object.fromEntries(formData));
    const database = getServiceDb();
    const [source] = await database.select().from(occasionFields).where(eq(occasionFields.id, parsed.id)).limit(1);
    if (!source) throw new Error("Champ introuvable.");
    const [target] = await database
      .select({ id: occasions.id })
      .from(occasions)
      .where(eq(occasions.id, parsed.targetOccasionId))
      .limit(1);
    if (!target) throw new Error("Occasion de destination introuvable.");
    await assertRoomForActiveField(target.id);
    const id = randomUUID();
    await database.insert(occasionFields).values({
      ...source,
      id,
      occasionId: target.id,
      key: await uniqueKey(target.id, source.label),
      translations: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await writeAuditLog({
      action: "occasion_field.duplicated",
      actorId: session.user.id,
      targetType: "occasion_field",
      targetId: id,
      metadata: { from: parsed.id, toOccasionId: target.id },
    });
    revalidateOccasionFields(target.id);
    return { ok: true, message: "Champ dupliqué. Lance « Actualiser les traductions » pour le traduire." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de dupliquer ce champ.") };
  }
}

export async function reorderOccasionFields(occasionId: string, formData: FormData) {
  const session = await requireAdmin();
  const { order } = reorderSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const existing = await database
    .select({ id: occasionFields.id })
    .from(occasionFields)
    .where(eq(occasionFields.occasionId, occasionId))
    .orderBy(asc(occasionFields.sortOrder));
  const existingIds = new Set(existing.map((field) => field.id));
  if (order.length !== existingIds.size || order.some((id) => !existingIds.has(id)))
    throw new Error("La liste des champs a changé. Recharge la page avant de recommencer.");
  const orderedRows = JSON.stringify(order.map((id, index) => ({ id, sort_order: (index + 1) * 10 })));
  await database.execute(
    sql`update ${occasionFields} set sort_order = ordered.sort_order, updated_at = now() from jsonb_to_recordset(${orderedRows}::jsonb) as ordered(id text, sort_order integer) where ${occasionFields.id} = ordered.id`,
  );
  await writeAuditLog({
    action: "occasion_field.reordered",
    actorId: session.user.id,
    targetType: "occasion",
    targetId: occasionId,
    metadata: { order },
  });
  revalidateOccasionFields(occasionId);
}

const addProposedSchema = z.object({
  occasionId: z.string().trim().min(1).max(120),
  proposals: z
    .string()
    .max(40000)
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: "Propositions invalides." });
        return z.NEVER;
      }
    })
    .pipe(z.array(z.record(z.string(), z.unknown())).min(1).max(8)),
});

export async function addProposedFields(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const parsed = addProposedSchema.parse(Object.fromEntries(formData));
    const database = getServiceDb();
    const [activeRow] = await database
      .select({ total: count() })
      .from(occasionFields)
      .where(and(eq(occasionFields.occasionId, parsed.occasionId), eq(occasionFields.active, true)));
    const room = MAX_ACTIVE_FIELDS_PER_OCCASION - (activeRow?.total ?? 0);
    if (parsed.proposals.length > room)
      throw new Error(`Il reste de la place pour ${Math.max(room, 0)} champ(s) actif(s) seulement.`);
    const [last] = await database
      .select({ sortOrder: occasionFields.sortOrder })
      .from(occasionFields)
      .where(eq(occasionFields.occasionId, parsed.occasionId))
      .orderBy(sql`${occasionFields.sortOrder} desc`)
      .limit(1);
    let order = (last?.sortOrder ?? 0) + 10;
    const created: string[] = [];
    for (const candidate of parsed.proposals) {
      // Revalidation complète côté serveur : le navigateur n'est jamais cru sur parole.
      const row = occasionFieldFormSchema.parse(
        proposalToFormInput(candidate as unknown as FieldProposal, parsed.occasionId, order),
      );
      const id = randomUUID();
      await database.insert(occasionFields).values({
        id,
        occasionId: parsed.occasionId,
        key: await uniqueKey(parsed.occasionId, row.label),
        label: row.label,
        helpText: row.helpText,
        icon: row.icon,
        placeholder: row.placeholder,
        type: row.type,
        options: row.options,
        config: row.config,
        required: row.required === "true",
        aiHint: row.aiHint,
        sortOrder: order,
        active: true,
      });
      created.push(id);
      order += 10;
    }
    await writeAuditLog({
      action: "occasion_field.ai_added",
      actorId: session.user.id,
      targetType: "occasion",
      targetId: parsed.occasionId,
      metadata: { fieldIds: created },
    });
    revalidateOccasionFields(parsed.occasionId);
    return {
      ok: true,
      message: `${created.length} champ(s) ajouté(s). Lance « Actualiser les traductions » pour les traduire.`,
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’ajouter les champs proposés.") };
  }
}
