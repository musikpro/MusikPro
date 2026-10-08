import { describe, expect, it } from "vitest";
import { finalTextAfterSearch } from "@/lib/ai/anthropic-core";

describe("finalTextAfterSearch", () => {
  it("garde seulement le texte placé après le dernier résultat de recherche", () => {
    const result = finalTextAfterSearch([
      { type: "text", text: "Je vais chercher ce style." },
      { type: "server_tool_use" },
      { type: "web_search_tool_result" },
      { type: "text", text: "Ivorian Coupé-Décalé, 120-135 BPM." },
    ]);
    expect(result).toEqual({ text: "Ivorian Coupé-Décalé, 120-135 BPM.", searched: true });
  });

  it("sans recherche : tous les blocs de texte, comme avant", () => {
    const result = finalTextAfterSearch([
      { type: "text", text: "Ligne 1" },
      { type: "text", text: "Ligne 2" },
    ]);
    expect(result).toEqual({ text: "Ligne 1\nLigne 2", searched: false });
  });
});
