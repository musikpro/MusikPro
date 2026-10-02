import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {}, getServiceDb: () => ({}) }));

import { pickTitleValue, toClientDefinition } from "@/lib/occasion-fields/server";

describe("pickTitleValue", () => {
  const answers = [
    { fieldId: "a", key: "a", label: "A", type: "short_text" as const, value: "Café Soleil", aiHint: "" },
  ];
  it("returns the answer of the title field", () => {
    expect(pickTitleValue(answers, "a")).toBe("Café Soleil");
  });
  it("returns an empty string without title field or answer", () => {
    expect(pickTitleValue(answers, null)).toBe("");
    expect(pickTitleValue(answers, "zzz")).toBe("");
  });
});

describe("toClientDefinition", () => {
  it("never exposes the AI hint", () => {
    const client = toClientDefinition({
      id: "f1",
      occasionId: "o1",
      key: "k",
      label: "L",
      helpText: "",
      icon: "",
      placeholder: "",
      type: "short_text",
      options: [],
      config: {},
      required: false,
      aiHint: "secret hint",
      sortOrder: 10,
      active: true,
      translations: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(JSON.stringify(client)).not.toContain("secret hint");
    expect(client).not.toHaveProperty("aiHint");
  });
});
