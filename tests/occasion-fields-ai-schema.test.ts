import { describe, expect, it } from "vitest";
import {
  MAX_AI_FIELD_PROPOSALS,
  parseBlockProposal,
  proposalToFormInput,
  sanitizeFieldProposals,
  sanitizeSingleProposal,
} from "@/lib/occasion-fields/ai-schema";
import { occasionFieldFormSchema } from "@/lib/occasion-fields/form-schema";

const ctx = { occasionId: "occ-1", existingLabels: [] as string[], room: 8 };

const good = {
  label: "Mois de naissance",
  type: "select",
  icon: "🗓️",
  placeholder: "",
  helpText: "",
  options: [
    { label: "Janvier", emoji: "❄️" },
    { label: "Février", emoji: "💝" },
  ],
  required: false,
  aiHint: "Evoke the birth month warmly.",
};

describe("sanitizeFieldProposals", () => {
  it("parses a JSON array, including inside a markdown fence or an object wrapper", () => {
    expect(sanitizeFieldProposals(JSON.stringify([good]), ctx)).toHaveLength(1);
    expect(sanitizeFieldProposals("```json\n" + JSON.stringify([good]) + "\n```", ctx)).toHaveLength(1);
    expect(sanitizeFieldProposals("Voici :\n" + JSON.stringify({ fields: [good] }), ctx)).toHaveLength(1);
  });

  it("returns an empty list for garbage instead of throwing", () => {
    expect(sanitizeFieldProposals("pas du json", ctx)).toEqual([]);
    expect(sanitizeFieldProposals("[1, 2, 3]", ctx)).toEqual([]);
  });

  it("drops invalid proposals but keeps the valid ones (unknown type, select with one option, bad emoji icon)", () => {
    const raw = JSON.stringify([
      good,
      { ...good, label: "Type inconnu", type: "checkbox" },
      { ...good, label: "Une seule option", options: [{ label: "Seul", emoji: "" }] },
      { ...good, label: "Icône texte", icon: "abc" },
    ]);
    const result = sanitizeFieldProposals(raw, ctx);
    expect(result.map((p) => p.label)).toEqual(["Mois de naissance"]);
  });

  it("drops labels that already exist, ignoring case and accents, and duplicates among proposals", () => {
    const raw = JSON.stringify([good, { ...good, label: "MOIS DE NAISSANCE" }, { ...good, label: "Âge fêté", type: "number" }]);
    const result = sanitizeFieldProposals(raw, { ...ctx, existingLabels: ["Âge Fete"] });
    expect(result.map((p) => p.label)).toEqual(["Mois de naissance"]);
  });

  it("caps the list at 6 and at the remaining room", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...good, label: `Champ ${i}`, type: "short_text", options: [] }));
    expect(sanitizeFieldProposals(JSON.stringify(many), ctx)).toHaveLength(MAX_AI_FIELD_PROPOSALS);
    expect(sanitizeFieldProposals(JSON.stringify(many), { ...ctx, room: 2 })).toHaveLength(2);
    expect(sanitizeFieldProposals(JSON.stringify(many), { ...ctx, room: 0 })).toEqual([]);
  });

  it("clamps an over-long AI hint to what the form schema accepts by rejecting the proposal", () => {
    const result = sanitizeFieldProposals(JSON.stringify([{ ...good, aiHint: "x".repeat(250) }]), ctx);
    expect(result).toEqual([]);
  });

  it("produces proposals that the admin form schema accepts as-is", () => {
    const [proposal] = sanitizeFieldProposals(JSON.stringify([good]), ctx);
    expect(() => occasionFieldFormSchema.parse(proposalToFormInput(proposal, "occ-1", 10))).not.toThrow();
  });
});

describe("sanitizeSingleProposal", () => {
  it("accepts one object and rejects an invalid one", () => {
    expect(sanitizeSingleProposal(JSON.stringify(good), { occasionId: "occ-1" })?.label).toBe("Mois de naissance");
    expect(sanitizeSingleProposal(JSON.stringify({ ...good, type: "nope" }), { occasionId: "occ-1" })).toBeNull();
  });
});

describe("parseBlockProposal", () => {
  const fields = [
    { id: "f1", label: "Nom du produit ou de la marque" },
    { id: "f2", label: "Public ciblé" },
  ];
  it("maps the title field label to an existing field id", () => {
    expect(
      parseBlockProposal(
        JSON.stringify({ showRecipient: false, showSender: false, titleFieldLabel: "nom du produit ou de la marque" }),
        fields,
      ),
    ).toEqual({ showRecipient: false, showSender: false, titleFieldId: "f1" });
  });
  it("ignores an invented title field and refuses malformed output", () => {
    expect(
      parseBlockProposal(JSON.stringify({ showRecipient: true, showSender: true, titleFieldLabel: "Inconnu" }), fields),
    ).toEqual({ showRecipient: true, showSender: true, titleFieldId: null });
    expect(parseBlockProposal("n'importe quoi", fields)).toBeNull();
    expect(parseBlockProposal(JSON.stringify({ showRecipient: "oui" }), fields)).toBeNull();
  });
});
