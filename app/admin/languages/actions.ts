"use server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { languages, localizationSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";

const languageSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    nativeName: z.string().trim().min(2).max(60),
    code: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z]{2,3}(?:-[a-z]{2})?$/),
    flag: z.string().trim().min(1).max(12),
    interfaceEnabled: z.enum(["true", "false"]),
    lyricsEnabled: z.enum(["true", "false"]),
    interfaceOrder: z.coerce.number().int().min(0).max(999),
    lyricsOrder: z.coerce.number().int().min(0).max(999),
  })
  .refine((value) => value.interfaceEnabled === "true" || value.lyricsEnabled === "true", {
    message: "Active au moins un usage.",
  });
const idSchema = z.object({ id: z.string().trim().min(1).max(120) });
const toggleSchema = idSchema.extend({ scope: z.enum(["interface", "lyrics"]) });
const automaticDetectionSchema = z.object({ enabled: z.enum(["true", "false"]) });
const defaultLanguageSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2,3}(?:-[a-z]{2})?$/),
});
function refresh() {
  ["/admin/languages", "/dashboard", "/dashboard/create/parameters", "/demo"].forEach((path) => revalidatePath(path));
}
export async function createLanguage(formData: FormData) {
  const session = await requireAdmin();
  const parsed = languageSchema.parse(Object.fromEntries(formData));
  const id = randomUUID();
  await getServiceDb()
    .insert(languages)
    .values({
      ...parsed,
      id,
      interfaceEnabled: parsed.interfaceEnabled === "true",
      lyricsEnabled: parsed.lyricsEnabled === "true",
    });
  await writeAuditLog({
    action: "language.created",
    actorId: session.user.id,
    targetType: "language",
    targetId: id,
    metadata: { code: parsed.code },
  });
  refresh();
  redirect("/admin/languages");
}
export async function updateLanguage(formData: FormData) {
  const session = await requireAdmin();
  const parsed = languageSchema.extend({ id: z.string().trim().min(1).max(120) }).parse(Object.fromEntries(formData));
  await getServiceDb()
    .update(languages)
    .set({
      ...parsed,
      interfaceEnabled: parsed.interfaceEnabled === "true",
      lyricsEnabled: parsed.lyricsEnabled === "true",
      updatedAt: new Date(),
    })
    .where(eq(languages.id, parsed.id));
  await writeAuditLog({
    action: "language.updated",
    actorId: session.user.id,
    targetType: "language",
    targetId: parsed.id,
    metadata: { code: parsed.code },
  });
  refresh();
  redirect("/admin/languages");
}
export async function toggleLanguageScope(formData: FormData) {
  const session = await requireAdmin();
  const parsed = toggleSchema.parse(Object.fromEntries(formData));
  const [row] = await getServiceDb().select().from(languages).where(eq(languages.id, parsed.id)).limit(1);
  if (!row) return;
  const patch =
    parsed.scope === "interface" ? { interfaceEnabled: !row.interfaceEnabled } : { lyricsEnabled: !row.lyricsEnabled };
  await getServiceDb()
    .update(languages)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(languages.id, parsed.id));
  await writeAuditLog({
    action: "language.scope.changed",
    actorId: session.user.id,
    targetType: "language",
    targetId: parsed.id,
    metadata: { scope: parsed.scope },
  });
  refresh();
}
export async function deleteLanguage(formData: FormData) {
  const session = await requireAdmin();
  const { id } = idSchema.parse(Object.fromEntries(formData));
  await getServiceDb().delete(languages).where(eq(languages.id, id));
  await writeAuditLog({ action: "language.deleted", actorId: session.user.id, targetType: "language", targetId: id });
  refresh();
}

export async function setDefaultLanguage(formData: FormData) {
  const session = await requireAdmin();
  const { code } = defaultLanguageSchema.parse(Object.fromEntries(formData));
  const [language] = await getServiceDb().select().from(languages).where(eq(languages.code, code)).limit(1);
  if (!language) return;
  await getServiceDb()
    .insert(localizationSettings)
    .values({ id: "global", defaultLanguageCode: code })
    .onConflictDoUpdate({
      target: localizationSettings.id,
      set: { defaultLanguageCode: code, updatedAt: new Date() },
    });
  await writeAuditLog({
    action: "localization.default_language.changed",
    actorId: session.user.id,
    targetType: "localization_settings",
    targetId: "global",
    metadata: { code },
  });
  refresh();
}

export async function updateAutomaticLanguageDetection(formData: FormData) {
  const session = await requireAdmin();
  const { enabled } = automaticDetectionSchema.parse(Object.fromEntries(formData));
  const automaticDetectionEnabled = enabled === "true";
  await getServiceDb()
    .insert(localizationSettings)
    .values({ id: "global", automaticDetectionEnabled })
    .onConflictDoUpdate({
      target: localizationSettings.id,
      set: { automaticDetectionEnabled, updatedAt: new Date() },
    });
  await writeAuditLog({
    action: "localization.automatic_detection.changed",
    actorId: session.user.id,
    targetType: "localization_settings",
    targetId: "global",
    metadata: { automaticDetectionEnabled },
  });
  refresh();
}
