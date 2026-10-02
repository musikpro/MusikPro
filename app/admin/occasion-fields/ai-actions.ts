"use server";

import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { occasionFields, occasions } from "@/db/schema";
import { actionErrorMessage } from "@/lib/admin/action-state";
import {
  completeFieldForOccasion,
  suggestBlocksForOccasion,
  suggestFieldsForOccasion,
} from "@/lib/ai/occasion-field-suggestions";
import { requireAdmin } from "@/lib/auth/session";
import type { FieldProposal } from "@/lib/occasion-fields/ai-schema";
import { MAX_ACTIVE_FIELDS_PER_OCCASION } from "@/lib/occasion-fields/types";
import { rateLimit } from "@/lib/security/rate-limit";

type Failure = { ok: false; message: string };

async function loadOccasion(occasionId: string) {
  const database = getServiceDb();
  const [occasion] = await database
    .select({ id: occasions.id, name: occasions.name, description: occasions.description })
    .from(occasions)
    .where(eq(occasions.id, occasionId))
    .limit(1);
  if (!occasion) throw new Error("Occasion introuvable.");
  const fields = await database
    .select({ id: occasionFields.id, label: occasionFields.label, type: occasionFields.type, active: occasionFields.active })
    .from(occasionFields)
    .where(eq(occasionFields.occasionId, occasionId))
    .orderBy(asc(occasionFields.sortOrder));
  return { occasion, fields };
}

function failure(error: unknown, fallback: string): Failure {
  if (error instanceof Error && error.message === "AI_PROVIDER_NOT_CONFIGURED")
    return { ok: false, message: "Aucun fournisseur IA n’est configuré. Enregistrez sa clé dans Fournisseurs IA, puis réessayez." };
  if (error instanceof Error && error.message === "CONTENT_BLOCKED_RESULT")
    return { ok: false, message: "La suggestion a été bloquée par la modération. Reformule le nom ou la description." };
  if (error instanceof Error && error.message === "RATE_LIMITED")
    return { ok: false, message: "Trop de suggestions IA. Réessaie dans une heure." };
  return { ok: false, message: actionErrorMessage(error, fallback) };
}

async function guard(userId: string) {
  const limit = await rateLimit(`admin:occasion-fields-ai:${userId}`, 30, 3600);
  if (limit.backend === "unavailable") throw new Error("Le contrôle de débit est indisponible.");
  if (!limit.success) throw new Error("RATE_LIMITED");
}

const occasionIdSchema = z.string().trim().min(1).max(120);

export async function proposeOccasionFields(
  occasionId: string,
): Promise<{ ok: true; proposals: FieldProposal[] } | Failure> {
  const session = await requireAdmin();
  try {
    const id = occasionIdSchema.parse(occasionId);
    await guard(session.user.id);
    const { occasion, fields } = await loadOccasion(id);
    const room = MAX_ACTIVE_FIELDS_PER_OCCASION - fields.filter((field) => field.active).length;
    if (room <= 0) return { ok: false, message: `Cette occasion a déjà ${MAX_ACTIVE_FIELDS_PER_OCCASION} champs actifs.` };
    const proposals = await suggestFieldsForOccasion(occasion, fields, room, session.user.id);
    if (!proposals.length) return { ok: false, message: "L’IA n’a proposé aucun nouveau champ valide. Réessaie." };
    return { ok: true, proposals };
  } catch (error) {
    return failure(error, "Impossible de proposer des champs pour le moment.");
  }
}

export async function completeOccasionField(input: {
  occasionId: string;
  label: string;
}): Promise<{ ok: true; proposal: FieldProposal } | Failure> {
  const session = await requireAdmin();
  try {
    const parsed = z
      .object({ occasionId: occasionIdSchema, label: z.string().trim().min(2).max(80) })
      .parse(input);
    await guard(session.user.id);
    const { occasion } = await loadOccasion(parsed.occasionId);
    const proposal = await completeFieldForOccasion(occasion, parsed.label, session.user.id);
    if (!proposal) return { ok: false, message: "L’IA n’a pas pu compléter ce champ. Reformule le libellé." };
    return { ok: true, proposal };
  } catch (error) {
    return failure(error, "Impossible de compléter ce champ pour le moment.");
  }
}

export async function proposeOccasionBlocks(
  occasionId: string,
): Promise<{ ok: true; showRecipient: boolean; showSender: boolean; titleFieldId: string | null } | Failure> {
  const session = await requireAdmin();
  try {
    const id = occasionIdSchema.parse(occasionId);
    await guard(session.user.id);
    const { occasion, fields } = await loadOccasion(id);
    const proposal = await suggestBlocksForOccasion(
      occasion,
      fields.filter((field) => field.active).map(({ id: fieldId, label }) => ({ id: fieldId, label })),
      session.user.id,
    );
    if (!proposal) return { ok: false, message: "L’IA n’a pas pu proposer de blocs. Réessaie." };
    return { ok: true, ...proposal };
  } catch (error) {
    return failure(error, "Impossible de proposer les blocs pour le moment.");
  }
}
