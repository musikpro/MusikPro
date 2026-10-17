import "server-only";

import { and, asc, eq, inArray, max, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { randomUUID } from "node:crypto";
import { db, getServiceDb } from "@/db";
import { trackingTags } from "@/db/schema";
import type { TrackingPlacement } from "@/lib/validation/tracking-tags";
import { parseTrackingCode, TrackingParseError, type TrackingNode } from "./parse";

export const TRACKING_TAGS_CACHE_TAG = "tracking-tags";

export type TrackingTagRow = {
  id: string;
  name: string;
  code: string;
  placement: TrackingPlacement;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Liste complète pour l'administration (/admin/tracking-tags), dans l'ordre choisi par glisser-déposer. */
export async function listTrackingTags(): Promise<TrackingTagRow[]> {
  const rows = await getServiceDb()
    .select()
    .from(trackingTags)
    .orderBy(asc(trackingTags.sortOrder), asc(trackingTags.createdAt));
  return rows.map((row) => ({ ...row, placement: row.placement as TrackingPlacement }));
}

/**
 * Nœuds à insérer pour une zone du site. Mis en cache jusqu'à la prochaine modification admin (invalidation par
 * tag). Base injoignable, migration pas encore appliquée ou code devenu invalide = aucune balise : une erreur de
 * suivi ne doit jamais casser la landing page ni le tableau de bord.
 */
export type TrackingScope = "landing" | "dashboard" | "all";

/** Emplacements enregistrés qui s'appliquent à chaque zone (« tout le site » n'est rendu qu'une fois, par le layout racine). */
const PLACEMENTS_BY_SCOPE: Record<TrackingScope, readonly string[]> = {
  landing: ["landing", "both"],
  dashboard: ["dashboard", "both"],
  all: ["all"],
};

export async function getActiveTrackingNodes(
  scope: TrackingScope,
): Promise<Array<{ id: string; nodes: TrackingNode[] }>> {
  try {
    return await unstable_cache(
      async () => {
        const rows = await db
          .select({ id: trackingTags.id, code: trackingTags.code })
          .from(trackingTags)
          .where(and(eq(trackingTags.enabled, true), inArray(trackingTags.placement, [...PLACEMENTS_BY_SCOPE[scope]])))
          .orderBy(asc(trackingTags.sortOrder), asc(trackingTags.createdAt));
        const out: Array<{ id: string; nodes: TrackingNode[] }> = [];
        for (const row of rows) {
          try {
            out.push({ id: row.id, nodes: parseTrackingCode(row.code) });
          } catch (error) {
            if (!(error instanceof TrackingParseError)) throw error;
          }
        }
        return out;
      },
      ["tracking-tags", scope],
      { tags: [TRACKING_TAGS_CACHE_TAG], revalidate: 3600 },
    )();
  } catch {
    return [];
  }
}

export async function saveTrackingTag(input: {
  id: string | null;
  name: string;
  code: string;
  placement: TrackingPlacement;
  enabled: boolean;
  actorId: string;
}): Promise<{ id: string; created: boolean }> {
  const database = getServiceDb();
  const now = new Date();
  if (input.id) {
    const updated = await database
      .update(trackingTags)
      .set({ name: input.name, code: input.code, placement: input.placement, enabled: input.enabled, updatedAt: now })
      .where(eq(trackingTags.id, input.id))
      .returning({ id: trackingTags.id });
    if (!updated.length) throw new Error("Balise introuvable.");
    return { id: input.id, created: false };
  }
  const id = randomUUID();
  const [last] = await database.select({ value: max(trackingTags.sortOrder) }).from(trackingTags);
  await database.insert(trackingTags).values({
    id,
    sortOrder: (last?.value ?? 0) + 10,
    name: input.name,
    code: input.code,
    placement: input.placement,
    enabled: input.enabled,
    createdBy: input.actorId,
  });
  return { id, created: true };
}

export async function deleteTrackingTag(id: string): Promise<{ name: string } | null> {
  const [row] = await getServiceDb()
    .delete(trackingTags)
    .where(eq(trackingTags.id, id))
    .returning({ name: trackingTags.name });
  return row ?? null;
}

/**
 * `<meta name="…" content="…">` des balises actives, au format de `Metadata.other` de Next : c'est ce qui les place
 * dans le <head> du HTML initial (indispensable à la vérification de domaine Facebook/Google, qui ne lit pas le
 * JavaScript). Un <meta> posé dans un composant arriverait trop tard, dans le flux de rendu diffusé en streaming.
 */
export async function getTrackingMetaOther(scope: TrackingScope): Promise<Record<string, string>> {
  const other: Record<string, string> = {};
  // Une page qui déclare ses propres métadonnées remplace celles du layout : elle reprend donc aussi « tout le site ».
  const scopes: TrackingScope[] = scope === "all" ? ["all"] : [scope, "all"];
  const groups = await Promise.all(scopes.map((current) => getActiveTrackingNodes(current)));
  for (const { nodes } of groups.flat()) {
    for (const node of nodes) {
      if (node.kind === "meta" && node.attrs.name && node.attrs.content !== undefined) {
        other[node.attrs.name] = node.attrs.content;
      }
    }
  }
  return other;
}

/** Enregistre l'ordre complet (même schéma que les autres catalogues triables) ; refuse une liste périmée. */
export async function reorderTrackingTags(order: string[]): Promise<void> {
  const database = getServiceDb();
  const existing = await database.select({ id: trackingTags.id }).from(trackingTags);
  const existingIds = new Set(existing.map((row) => row.id));
  if (order.length !== existingIds.size || order.some((id) => !existingIds.has(id))) {
    throw new Error("La liste des balises a changé. Recharge la page avant de recommencer.");
  }
  const orderedRows = JSON.stringify(order.map((id, index) => ({ id, sort_order: (index + 1) * 10 })));
  await database.execute(
    sql`update ${trackingTags} set sort_order = ordered.sort_order, updated_at = now() from jsonb_to_recordset(${orderedRows}::jsonb) as ordered(id text, sort_order integer) where ${trackingTags.id} = ordered.id`,
  );
}
