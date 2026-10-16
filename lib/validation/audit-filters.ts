import { z } from "zod";

/** Filtres du journal d'audit (/admin/audit et son export CSV) : lus dans l'URL, donc toujours revalidés. */

const MAX_PAGE = 100_000;

function isRealDay(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (format AAAA-MM-JJ).")
  .refine(isRealDay, "Date invalide (jour inexistant).");

export const auditFiltersSchema = z
  .object({
    actor: z.string().trim().min(1).max(120, "Recherche d'acteur trop longue.").optional(),
    action: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[A-Za-z0-9_.:-]+$/, "Action invalide.")
      .optional(),
    from: day.optional(),
    to: day.optional(),
    page: z.coerce.number().int().min(1, "Page invalide.").max(MAX_PAGE, "Page invalide.").default(1),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "La période est inversée : la date de début dépasse la date de fin.",
    path: ["to"],
  });

export type AuditFilters = z.infer<typeof auditFiltersSchema>;

export type ParsedAuditFilters = { filters: AuditFilters; error: string | null };

type RawParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  const single = Array.isArray(value) ? value[0] : value;
  return single === undefined || single.trim() === "" ? undefined : single;
}

/** Lit les paramètres d'URL ; en cas d'erreur, renvoie des filtres vides et le message à afficher. */
export function parseAuditFilters(raw: RawParams): ParsedAuditFilters {
  const parsed = auditFiltersSchema.safeParse({
    actor: firstValue(raw.actor),
    action: firstValue(raw.action),
    from: firstValue(raw.from),
    to: firstValue(raw.to),
    page: firstValue(raw.page),
  });
  if (parsed.success) {
    // Zod laisse les clés absentes hors de l'objet (propriétés optionnelles) : on ne garde que les renseignées.
    const filters = Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value !== undefined));
    return { filters: filters as AuditFilters, error: null };
  }
  return { filters: { page: 1 }, error: parsed.error.issues[0]?.message ?? "Filtres invalides." };
}

/** Reconstruit la chaîne de requête (liens de pagination, bouton d'export) à partir de filtres validés. */
export function auditFiltersToSearchParams(
  filters: AuditFilters,
  options: { withPage?: boolean } = {},
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.actor) params.set("actor", filters.actor);
  if (filters.action) params.set("action", filters.action);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (options.withPage && filters.page > 1) params.set("page", String(filters.page));
  return params;
}
