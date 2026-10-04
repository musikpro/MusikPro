import { describe, expect, it } from "vitest";
import {
  CREATION_DRAFT_STEPS,
  creationDraftSaveSchema,
  isCreationDraftWorthKeeping,
  type CreationDraftData,
} from "@/lib/validation/creation-draft";
import { lyricsPreview, resumeStepFor, summarizeCreationDraft } from "@/lib/creation-draft/summary";

const data = (overrides: Partial<CreationDraftData["fields"]> = {}, occasion = "Anniversaire"): CreationDraftData => ({
  choices: {
    occasion,
    genre: "Afrobeat",
    mood: "Modéré",
    language: "Français",
    voice: "Féminine",
    recipientRelation: "Maman",
  },
  fields: {
    story: "Une belle histoire",
    recipientName: "Awa",
    recipientPronunciation: "a-oua",
    senderName: "Issa",
    senderPronunciation: "i-sa",
    lyrics: "Maman, tu es ma lumière",
    detail: "",
    ...overrides,
  },
  details: { "field-1": "Bleu" },
  packIndex: -1,
});

describe("creationDraftSaveSchema", () => {
  it("accepts a complete draft", () => {
    expect(creationDraftSaveSchema.safeParse({ step: "lyrics", data: data() }).success).toBe(true);
  });

  it("refuses unknown steps, extra keys and oversized text", () => {
    expect(creationDraftSaveSchema.safeParse({ step: "lyrics/generating", data: data() }).success).toBe(false);
    expect(creationDraftSaveSchema.safeParse({ step: "lyrics", data: data(), userId: "other" }).success).toBe(false);
    expect(creationDraftSaveSchema.safeParse({ step: "story", data: { ...data(), extra: true } }).success).toBe(false);
    expect(creationDraftSaveSchema.safeParse({ step: "story", data: data({ story: "a".repeat(601) }) }).success).toBe(
      false,
    );
    expect(
      creationDraftSaveSchema.safeParse({ step: "lyrics", data: data({ lyrics: "a".repeat(18_001) }) }).success,
    ).toBe(false);
  });

  it("covers every wizard step of the creation flow", () => {
    expect(CREATION_DRAFT_STEPS).toContain("confirm");
    expect(CREATION_DRAFT_STEPS).not.toContain("lyrics/generating");
  });

  it("only keeps drafts that have an occasion", () => {
    expect(isCreationDraftWorthKeeping(data())).toBe(true);
    expect(isCreationDraftWorthKeeping(data({}, "  "))).toBe(false);
  });
});

describe("creation draft summary", () => {
  it("marks story, style and lyrics as done and leaves checkout open", () => {
    const steps = summarizeCreationDraft(data());
    expect(steps.map((step) => [step.id, step.done])).toEqual([
      ["story", true],
      ["style", true],
      ["lyrics", true],
      ["checkout", false],
    ]);
    expect(steps[0].detail).toBe("Anniversaire · Awa");
    expect(steps[1].detail).toBe("Afrobeat · Modéré");
  });

  it("does not claim steps that have no content", () => {
    const steps = summarizeCreationDraft(data({ story: "", lyrics: "" }));
    expect(steps[0].done).toBe(false);
    expect(steps[2].done).toBe(false);
  });

  it("shortens the lyrics preview on one line", () => {
    expect(lyricsPreview("a\n\nb   c")).toBe("a b c");
    expect(lyricsPreview("x".repeat(300)).length).toBeLessThanOrEqual(161);
  });

  it("sends the user back to the parameters when the lyrics are gone", () => {
    expect(resumeStepFor("confirm", data({ lyrics: "" }))).toBe("parameters");
    expect(resumeStepFor("confirm", data())).toBe("confirm");
    expect(resumeStepFor("story", data({ lyrics: "" }))).toBe("story");
  });
});
