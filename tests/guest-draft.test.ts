import { describe, expect, it } from "vitest";
import {
  GUEST_DRAFT_KEY,
  GUEST_DRAFT_TTL_MS,
  isGuestDraftWorthKeeping,
  parseGuestDraft,
  serializeGuestDraft,
} from "@/lib/guest/draft";
import type { CreationDraftData } from "@/lib/validation/creation-draft";

const baseData: CreationDraftData = {
  choices: {
    occasion: "Amour",
    genre: "Neutre",
    mood: "Romantique",
    language: "Français",
    voice: "Duo",
    recipientRelation: "Mon mari",
  },
  fields: {
    story: "Adjoua dédie cette chanson à Kouamé.",
    recipientName: "Kouamé",
    recipientPronunciation: "Koua-mé",
    senderName: "Adjoua",
    senderPronunciation: "Ad-joua",
    lyrics: "",
    detail: "",
  },
  details: { nickname: "Mon roi" },
  packIndex: -1,
};

const NOW = new Date("2026-10-12T20:00:00Z");

describe("brouillon invité", () => {
  it("expose une clé de stockage versionnée", () => {
    expect(GUEST_DRAFT_KEY).toBe("musikpro:guest-draft:v1");
  });

  it("relit ce qu'il a sérialisé (aller-retour)", () => {
    const raw = serializeGuestDraft(baseData, NOW);
    expect(parseGuestDraft(raw, NOW)).toEqual(baseData);
  });

  it("refuse un brouillon plus vieux que sa durée de vie", () => {
    const raw = serializeGuestDraft(baseData, NOW);
    const later = new Date(NOW.getTime() + GUEST_DRAFT_TTL_MS + 1000);
    expect(parseGuestDraft(raw, later)).toBeNull();
  });

  it("accepte un brouillon juste avant l'expiration", () => {
    const raw = serializeGuestDraft(baseData, NOW);
    const almost = new Date(NOW.getTime() + GUEST_DRAFT_TTL_MS - 1000);
    expect(parseGuestDraft(raw, almost)).toEqual(baseData);
  });

  it.each([null, "", "pas du json", "{}", '{"savedAt":"x","data":{}}', "[]", "null"])(
    "refuse la valeur illisible %j",
    (raw) => {
      expect(parseGuestDraft(raw, NOW)).toBeNull();
    },
  );

  it("refuse un champ inconnu (schéma strict) et une taille excessive", () => {
    const withExtra = JSON.stringify({ savedAt: NOW.toISOString(), data: { ...baseData, secret: "x" } });
    expect(parseGuestDraft(withExtra, NOW)).toBeNull();
    const tooLong = { ...baseData, fields: { ...baseData.fields, recipientName: "n".repeat(101) } };
    expect(parseGuestDraft(JSON.stringify({ savedAt: NOW.toISOString(), data: tooLong }), NOW)).toBeNull();
  });

  it("ne vaut la peine d'être gardé qu'avec une occasion choisie", () => {
    expect(isGuestDraftWorthKeeping(baseData)).toBe(true);
    expect(isGuestDraftWorthKeeping({ ...baseData, choices: { ...baseData.choices, occasion: "  " } })).toBe(false);
  });
});
