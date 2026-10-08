"use server";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { languageAccents, languages, musicStyleAccents, musicStyles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { languageAccentSchema } from "@/lib/validation/language-accents";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

const idSchema = z.object({ id: z.string().trim().min(1).max(120) });

function refresh() {
  revalidatePath("/admin/languages");
}

/** Crée ou met à jour une variante d'accent et remplace la liste des styles qui l'utilisent. */
export async function saveLanguageAccent(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = languageAccentSchema.parse({
      ...Object.fromEntries(formData),
      styleIds: formData.getAll("styleIds").map(String),
    });
    const database = getServiceDb();
    const [language] = await database
      .select({ code: languages.code })
      .from(languages)
      .where(eq(languages.code, parsed.languageCode))
      .limit(1);
    if (!language) return { ok: false, message: "Langue introuvable." };
    const styleIds = [...new Set(parsed.styleIds)];
    if (styleIds.length) {
      const known = await database
        .select({ id: musicStyles.id })
        .from(musicStyles)
        .where(inArray(musicStyles.id, styleIds));
      if (known.length !== styleIds.length) return { ok: false, message: "Un des styles choisis n’existe plus." };
    }
    const id = parsed.id ?? randomUUID();
    const values = {
      languageCode: parsed.languageCode,
      name: parsed.name,
      country: parsed.country,
      aiHint: parsed.aiHint,
      active: parsed.active === "true",
      sortOrder: parsed.sortOrder,
      updatedAt: new Date(),
    };
    await database
      .insert(languageAccents)
      .values({ id, ...values })
      .onConflictDoUpdate({ target: languageAccents.id, set: values });
    // Un style n'a qu'une variante par langue : l'associer ici la retire de l'éventuelle autre variante.
    await database.delete(musicStyleAccents).where(eq(musicStyleAccents.accentId, id));
    if (styleIds.length) {
      await database
        .insert(musicStyleAccents)
        .values(styleIds.map((styleId) => ({ styleId, accentId: id, languageCode: parsed.languageCode })))
        .onConflictDoUpdate({
          target: [musicStyleAccents.styleId, musicStyleAccents.languageCode],
          set: { accentId: id },
        });
    }
    await writeAuditLog({
      action: parsed.id ? "language.accent.updated" : "language.accent.created",
      actorId: session.user.id,
      targetType: "language_accent",
      targetId: id,
      metadata: { languageCode: parsed.languageCode, styles: styleIds.length },
    });
    refresh();
    return { ok: true, message: parsed.id ? "Accent enregistré." : "Accent ajouté." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer cet accent.") };
  }
}

export async function toggleLanguageAccent(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { id } = idSchema.parse(Object.fromEntries(formData));
    const database = getServiceDb();
    const [row] = await database.select().from(languageAccents).where(eq(languageAccents.id, id)).limit(1);
    if (!row) return { ok: false, message: "Accent introuvable." };
    await database
      .update(languageAccents)
      .set({ active: !row.active, updatedAt: new Date() })
      .where(eq(languageAccents.id, id));
    await writeAuditLog({
      action: "language.accent.toggled",
      actorId: session.user.id,
      targetType: "language_accent",
      targetId: id,
      metadata: { active: !row.active },
    });
    refresh();
    return { ok: true, message: row.active ? "Accent désactivé." : "Accent activé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier cet accent.") };
  }
}

export async function deleteLanguageAccent(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { id } = idSchema.parse(Object.fromEntries(formData));
    await getServiceDb().delete(languageAccents).where(eq(languageAccents.id, id));
    await writeAuditLog({
      action: "language.accent.deleted",
      actorId: session.user.id,
      targetType: "language_accent",
      targetId: id,
    });
    refresh();
    return { ok: true, message: "Accent supprimé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer cet accent.") };
  }
}
