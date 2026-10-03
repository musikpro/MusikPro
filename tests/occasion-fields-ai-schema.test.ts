import { describe, expect, it } from "vitest";
import {
  MAX_AI_FIELD_PROPOSALS,
  parseBlockProposal,
  planProposalInserts,
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

describe("planProposalInserts", () => {
  const proposals = (labels: string[]) =>
    sanitizeFieldProposals(
      JSON.stringify(labels.map((label) => ({ ...good, label, type: "short_text", options: [] }))),
      ctx,
    );
  it("plans rows with strictly increasing sort orders", () => {
    const rows = planProposalInserts(proposals(["Champ A", "Champ B", "Champ C"]), { occasionId: "occ-1", lastSortOrder: 20, takenKeys: [] });
    expect(rows.map((r) => r.sortOrder)).toEqual([30, 40, 50]);
  });
  it("keeps sort orders within 999 on overflow", () => {
    const rows = planProposalInserts(proposals(["Champ A", "Champ B", "Champ C"]), { occasionId: "occ-1", lastSortOrder: 995, takenKeys: [] });
    expect(rows.map((r) => r.sortOrder)).toEqual([979, 989, 999]);
  });
  it("throws before producing anything when one proposal is invalid", () => {
    const list = [...proposals(["Champ A", "Champ B"]), { label: "X", type: "nope" }];
    expect(() => planProposalInserts(list, { occasionId: "occ-1", lastSortOrder: 0, takenKeys: [] })).toThrow();
    const bad = [...proposals(["Champ A"]), { ...proposals(["Champ B"])[0], aiHint: "x".repeat(250) }];
    expect(() => planProposalInserts(bad, { occasionId: "occ-1", lastSortOrder: 0, takenKeys: [] })).toThrow(/invalide/);
  });
  it("avoids key collisions between proposals and with existing keys", () => {
    const [one] = proposals(["Prénom"]);
    const rows = planProposalInserts([one, { ...one, label: "Prenom!" }], {
      occasionId: "occ-1",
      lastSortOrder: 0,
      takenKeys: ["prenom"],
    });
    expect(rows.map((r) => r.key)).toEqual(["prenom_2", "prenom_3"]);
  });
});

describe("sanitizeSingleProposal — indices numériques incohérents de l'IA", () => {
  const one = (extra: Record<string, unknown>, base: Record<string, unknown> = good) =>
    sanitizeSingleProposal(JSON.stringify({ ...base, ...extra }), { occasionId: "occ-1" });

  it("ignore maxLength: 0 sur une liste de choix (cas réel qui faisait échouer « Compléter avec l'IA »)", () => {
    expect(one({ maxLength: 0 })?.type).toBe("select");
  });
  it("ignore min/max sur un champ qui n'est pas un nombre", () => {
    expect(one({ min: 5, max: 1 })?.type).toBe("select");
  });
  it("ignore un maxLength hors bornes ou trop grand pour un texte court", () => {
    const text = { ...good, type: "short_text", options: [] };
    expect(one({ maxLength: 0 }, text)?.config.maxLength).toBe(100);
    expect(one({ maxLength: 900 }, text)?.config.maxLength).toBe(100);
    expect(one({ maxLength: 500 }, text)?.config.maxLength).toBe(100);
    expect(one({ maxLength: 150 }, text)?.config.maxLength).toBe(150);
  });
  it("ignore un min supérieur au max sur un nombre", () => {
    const number = { ...good, type: "number", options: [] };
    expect(one({ min: 10, max: 1 }, number)?.type).toBe("number");
  });
});
