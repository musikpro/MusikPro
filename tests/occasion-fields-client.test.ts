import { describe, expect, it } from "vitest";
import { blockVisibility, clearHiddenBlockValues } from "@/lib/occasion-fields/client";

describe("blockVisibility", () => {
  it("defaults to showing both blocks (occasions without configuration are unchanged)", () => {
    expect(blockVisibility(undefined)).toEqual({ showRecipient: true, showSender: true });
    expect(blockVisibility({})).toEqual({ showRecipient: true, showSender: true });
  });
  it("honours the occasion settings", () => {
    expect(blockVisibility({ showRecipient: false, showSender: false })).toEqual({
      showRecipient: false,
      showSender: false,
    });
  });
});

describe("clearHiddenBlockValues", () => {
  const current = {
    fields: {
      recipientName: "Awa",
      recipientPronunciation: "A-wa",
      senderName: "Moussa",
      senderPronunciation: "Mou-ssa",
      story: "histoire",
    },
    choices: { recipientRelation: "Ma mère", genre: "Afrobeat" },
  };

  it("clears recipient and sender leftovers when their blocks are hidden, and nothing else", () => {
    const result = clearHiddenBlockValues({ showRecipient: false, showSender: false }, current);
    expect(result.fields).toMatchObject({
      recipientName: "",
      recipientPronunciation: "",
      senderName: "",
      senderPronunciation: "",
      story: "histoire",
    });
    expect(result.choices).toMatchObject({ recipientRelation: "", genre: "Afrobeat" });
  });

  it("keeps everything when both blocks are visible", () => {
    expect(clearHiddenBlockValues({ showRecipient: true, showSender: true }, current)).toEqual(current);
  });
});
