import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPronunciation, normalizedName, prepareMusicfulLyrics } from "@/lib/phonetics-offline/engine";
import { serverPronunciation } from "@/lib/phonetics-offline/server";
import { BUILTIN_NAMES } from "@/lib/phonetics-offline/dictionary";
import { AFRICAN_FRANCOPHONE_ADOPTED_NAMES } from "@/lib/phonetics-offline/adopted-french-dictionary";
import { AFRICAN_MUSLIM_USED_NAMES } from "@/lib/phonetics-offline/african-muslim-used-names-dictionary";

const examples: [string, string, "high" | "low" | "unknown"][] = [
  ["Issa", "Is-sa", "high"],
  ["Moussa", "Mou-ssa", "high"],
  ["Aïcha", "Aï-cha", "high"],
  ["Kouassi", "Koua-ssi", "high"],
  ["Traoré", "Tra-o-ré", "high"],
  ["N’Guessan", "N'Gue-ssan", "high"],
  ["Richard", "Ri-char", "high"],
  ["RICHARD", "Ri-char", "high"],
  ["Guillaume", "Gui-yom", "high"],
  ["Evra", "Èv-ra", "high"],
  ["François", "Fran-soua", "high"],
  ["Francois", "Fran-soua", "high"],
  ["Patrick", "Pa-trik", "high"],
  ["Jean-Pierre", "Jean-Pierre", "high"],
  ["Richard Kouassi", "Ri-char Koua-ssi", "high"],
  ["Guillaume Traoré", "Gui-yom Tra-o-ré", "high"],
  ["Jean-Pierre Koné", "Jean-Pierre Ko-né", "high"],
  ["Madou", "Ma-dou", "high"],
  ["Mohammed", "Mo-ha-med", "high"],
  ["Mamadou", "Ma-ma-dou", "high"],
  ["Mouhamadou", "Mou-ha-ma-dou", "high"],
  ["Ahmadou", "Ah-ma-dou", "high"],
  ["Djibril", "Dji-bril", "high"],
  ["Oumou", "Ou-mou", "high"],
  ["Aïssatou", "Aï-ssa-tou", "high"],
  ["AISSATOU", "Aï-ssa-tou", "high"],
  ["Fatimatou", "Fa-ti-ma-tou", "high"],
  ["Mamadou Madou", "Ma-ma-dou Ma-dou", "high"],
  ["Mouhamadou Traoré", "Mou-ha-ma-dou Tra-o-ré", "high"],
  ["Richard Abdoul Karim", "Ri-char Ab-doul Ka-rim", "high"],
  ["Bokara", "Bo-ka-ra", "low"],
  ["ZZZ", "ZZZ", "unknown"],
];

describe("dictionnaire phonétique local", () => {
  it("conserve les 737 entrées africaines et les 316 francophones, et ajoute les 301 noms musulmans africains", () => {
    expect(AFRICAN_FRANCOPHONE_ADOPTED_NAMES).toHaveLength(316);
    expect(AFRICAN_MUSLIM_USED_NAMES).toHaveLength(301);
    expect(BUILTIN_NAMES).toHaveLength(737 + 316 + 301);
    const keys = new Set(BUILTIN_NAMES.map((entry) => normalizedName(entry.name)));
    expect(keys.size).toBe(1341);
  });

  it("n'écrase aucune entrée existante : les ajouts V4 n'ont ni doublon normalisé ni conflit", () => {
    const prior = BUILTIN_NAMES.slice(0, 737 + 316);
    const priorKeys = new Map(prior.map((entry) => [normalizedName(entry.name), entry.pronunciation]));
    const added = new Set<string>();
    for (const entry of AFRICAN_MUSLIM_USED_NAMES) {
      const key = normalizedName(entry.name);
      expect(priorKeys.has(key), `${entry.name} recoupe l'existant`).toBe(false);
      expect(added.has(key), `${entry.name} en double dans la V4`).toBe(false);
      added.add(key);
    }
  });

  it("distingue Madou de Mamadou et reconnaît les variantes de casse", () => {
    expect(getPronunciation("MaDoU").source).toBe("dictionary");
    expect(getPronunciation("Madou").pronunciation).not.toBe(getPronunciation("Mamadou").pronunciation);
  });

  it.each(examples)("%s → %s (%s)", (name, phonetic, confidence) => {
    const result = getPronunciation(name);
    expect(result.pronunciation).toBe(phonetic);
    expect(result.confidence).toBe(confidence);
    expect(result.needsReview).toBe(confidence !== "high");
  });

  it("résout chaque entrée du corpus depuis le dictionnaire", () => {
    for (const entry of BUILTIN_NAMES) {
      expect(getPronunciation(entry.name).source).toBe("dictionary");
    }
  });

  it("refuse les saisies hors alphabet de noms", () => {
    expect(getPronunciation("<script>").confidence).toBe("unknown");
    expect(getPronunciation("").pronunciation).toBe("");
  });

  it("ne remplace que les noms entiers dans les paroles Musicful et garde l'original", () => {
    const raw = "Richard dédie une chanson à Guillaume et Evra. Le nom Richardine ne doit pas changer.";
    const prepared = prepareMusicfulLyrics(raw, ["Richard", "Guillaume", "Evra"]);
    expect(prepared.originalLyrics).toBe(raw);
    expect(prepared.musicfulLyrics).toBe(
      "Ri-char dédie une chanson à Gui-yom et Èv-ra. Le nom Richardine ne doit pas changer.",
    );
  });

  it("prépare les paroles avec les noms musulmans africains", () => {
    expect(
      prepareMusicfulLyrics("Mohammed chante pour Madou, Mamadou et Aïssatou", [
        "Mohammed",
        "Madou",
        "Mamadou",
        "Aïssatou",
      ]).musicfulLyrics,
    ).toBe("Mo-ha-med chante pour Ma-dou, Ma-ma-dou et Aï-ssa-tou");
  });

  it("applique la politique « keep-original » aux noms inconnus", () => {
    expect(
      prepareMusicfulLyrics("Bokara chante", ["Bokara"], { unknownNamePolicy: "keep-original" }).musicfulLyrics,
    ).toBe("Bokara chante");
  });
});

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("prononciation côté serveur", () => {
  it("recalcule depuis le nom et renvoie une chaîne vide pour un nom vide", () => {
    expect(serverPronunciation("Guillaume")).toBe("Gui-yom");
    expect(serverPronunciation("  ")).toBe("");
    expect(serverPronunciation(undefined)).toBe("");
  });

  it("la route de paroles écrase les prononciations envoyées par le navigateur", () => {
    const route = read("app/api/ai/generate/route.ts");
    expect(route).toContain("task.input.recipientPronunciation = serverPronunciation(task.input.recipientName)");
    expect(route).toContain("task.input.senderPronunciation = serverPronunciation(task.input.senderName)");
    expect(route.indexOf("serverPronunciation(task.input.recipientName)")).toBeLessThan(
      route.indexOf("runLyricsTask("),
    );
  });

  it("la route de chanson prépare les paroles Musicful depuis les noms seuls", () => {
    const route = read("app/api/songs/generate/route.ts");
    expect(route).toContain("prepareMusicfulLyrics(lyrics, [input.recipientName, input.senderName]");
    expect(route).toContain('unknownNamePolicy: "keep-original"');
    expect(route).toMatch(/lyrics:\s*musicfulLyrics/);
    expect(route).not.toMatch(/Pronunciation/);
  });

  it("la route /api/ai/pronunciation n'appelle plus aucun fournisseur IA", () => {
    const route = read("app/api/ai/pronunciation/route.ts");
    expect(route).not.toMatch(/getLyricsProvider|classifyAnthropicError|classifyOpenAiError/);
    const lib = read("lib/ai/pronunciation.ts");
    expect(lib).not.toMatch(/createOpenAiClient|runAnthropicLyricsTask|getLyricsProvider/);
  });
});

describe("formulaire client", () => {
  const form = read("components/banani/StepRecipient.tsx");

  it("n'effectue aucune requête réseau pour la phonétique", () => {
    expect(form).not.toMatch(/apiFetch|fetch\(|\/api\/ai\/pronunciation/);
    expect(form).toContain("getPronunciation");
  });

  it("garde les deux champs « Prononciation suggérée » en lecture seule, sans onChange", () => {
    const fields = form.split("<input").filter((chunk) => /Pronunciation|Phonetic/.test(chunk.split("/>")[0]));
    const readonlyInputs = fields.filter(
      (chunk) => chunk.includes("readOnly") && chunk.includes('aria-readonly="true"'),
    );
    expect(readonlyInputs.length).toBeGreaterThanOrEqual(2);
    for (const chunk of readonlyInputs) expect(chunk.split("/>")[0]).not.toContain("onChange");
  });
});
