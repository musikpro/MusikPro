import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
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

/** Liste complète pour l'administration (/admin/tracking-tags), triée par date de création. */
export async function listTrackingTags(): Promise<TrackingTagRow[]> {
  const rows = await getServiceDb().select().from(trackingTags).orderBy(asc(trackingTags.createdAt));
  return rows.map((row) => ({ ...row, placement: row.placement as TrackingPlacement }));
}

/**
 * Nœuds à insérer pour une zone du site. Mis en cache jusqu'à la prochaine modification admin (invalidation par
 * tag). Base injoignable, migration pas encore appliquée ou code devenu invalide = aucune balise : une erreur de
 * suivi ne doit jamais casser la landing page ni le tableau de bord.
 */
export async function getActiveTrackingNodes(
  scope: "landing" | "dashboard",
): Promise<Array<{ id: string; nodes: TrackingNode[] }>> {
  try {
    return await unstable_cache(
      async () => {
        const rows = await db
          .select({ id: trackingTags.id, code: trackingTags.code })
          .from(trackingTags)
          .where(and(eq(trackingTags.enabled, true), inArray(trackingTags.placement, [scope, "both"])))
          .orderBy(asc(trackingTags.createdAt));
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
  await database.insert(trackingTags).values({
    id,
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
export async function getTrackingMetaOther(scope: "landing" | "dashboard"): Promise<Record<string, string>> {
  const other: Record<string, string> = {};
  for (const { nodes } of await getActiveTrackingNodes(scope)) {
    for (const node of nodes) {
      if (node.kind === "meta" && node.attrs.name && node.attrs.content !== undefined) {
        other[node.attrs.name] = node.attrs.content;
      }
    }
  }
  return other;
}
