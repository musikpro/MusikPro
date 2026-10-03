import { describe, expect, it } from "vitest";
import type { FieldProposal } from "@/lib/occasion-fields/ai-schema";
import { hasFilledValues, proposalDifferences, type FieldDraftSnapshot } from "@/lib/occasion-fields/proposal-diff";

const proposal: FieldProposal = {
  label: "Type de fête",
  helpText: "Choisis le type",
  icon: "🎉",
  placeholder: "",
  type: "select",
  options: [{ label: "Anniversaire", emoji: "🎂" }],
  config: { display: "tiles" },
  required: true,
  aiHint: "Use the party type.",
};
const optionsText = "🎂 Anniversaire";
const empty: FieldDraftSnapshot = { type: "short_text", label: "Type de fête", helpText: "", placeholder: "", icon: "📝", optionsText: "", required: "false", aiHint: "" };

describe("proposalDifferences / hasFilledValues", () => {
  it("un formulaire vierge (libellé seul) ne demande pas de confirmation, malgré un type par défaut différent", () => {
    const diffs = proposalDifferences(empty, proposal, optionsText);
    expect(diffs.length).toBeGreaterThan(0);
    expect(hasFilledValues(diffs, false)).toBe(false);
  });
  it("des valeurs déjà saisies demandent une confirmation", () => {
    const filled = { ...empty, helpText: "Mon aide", type: "select", optionsText: "A\nB" };
    const diffs = proposalDifferences(filled, proposal, optionsText);
    expect(hasFilledValues(diffs, false)).toBe(true);
    expect(hasFilledValues(proposalDifferences(empty, proposal, optionsText), true)).toBe(true);
    expect(diffs.find((d) => d.key === "helpText")).toMatchObject({ current: "Mon aide", proposed: "Choisis le type" });
  });
  it("ne liste pas une valeur identique", () => {
    const same = { ...empty, type: "select", icon: "🎉", helpText: "Choisis le type", optionsText, required: "true", aiHint: "Use the party type." };
    expect(proposalDifferences(same, proposal, optionsText)).toEqual([]);
  });
});
