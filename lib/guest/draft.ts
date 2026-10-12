import { z } from "zod";
import {
  creationDraftDataSchema,
  isCreationDraftWorthKeeping,
  type CreationDraftData,
} from "@/lib/validation/creation-draft";

/**
 * Brouillon du visiteur invité, gardé dans le navigateur (localStorage) : le parcours avant le portail de connexion
 * contient l'histoire, les noms et les détails, que le simple brouillon local des choix ne conserve pas. Le serveur
 * ne le reçoit qu'une fois le visiteur connecté. Aucune donnée personnelle sensible : uniquement ce que le visiteur
 * saisit dans le parcours de création.
 */
export const GUEST_DRAFT_KEY = "musikpro:guest-draft:v1";
/** Même durée de vie que le cookie invité (7 jours). */
export const GUEST_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const storedGuestDraftSchema = z.object({ savedAt: z.string().datetime(), data: creationDraftDataSchema }).strict();

export function serializeGuestDraft(data: CreationDraftData, now: Date = new Date()): string {
  return JSON.stringify({ savedAt: now.toISOString(), data });
}

/** Relit un brouillon stocké ; `null` si absent, illisible, hors schéma strict ou expiré. */
export function parseGuestDraft(raw: string | null, now: Date = new Date()): CreationDraftData | null {
  if (!raw) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = storedGuestDraftSchema.safeParse(json);
  if (!parsed.success) return null;
  const age = now.getTime() - new Date(parsed.data.savedAt).getTime();
  if (age > GUEST_DRAFT_TTL_MS) return null;
  return parsed.data.data;
}

export function isGuestDraftWorthKeeping(data: CreationDraftData): boolean {
  return isCreationDraftWorthKeeping(data);
}
