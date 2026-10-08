import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const runProviderTextTask = vi.fn();
vi.mock("@/lib/ai/provider", () => ({ getLyricsProvider: vi.fn(async () => ({ enabled: true, apiKey: "test" })) }));
vi.mock("@/lib/ai/text-generation", () => ({
  runProviderTextTask: (...args: unknown[]) => runProviderTextTask(...args),
}));

import { generatePhonePrefixRule, phoneResearchPrompt, phoneRulePrompt, phoneRuleSchema } from "@/lib/ai/phone-prefix";
import { phonePrefixRequestSchema } from "@/lib/validation/ai";
import { checkDialCode, checkDigits, checkExample } from "@/lib/languages/phone-validation";

const input = { countryCode: "CM", countryName: "Cameroun" };
const notes = { id: "n", text: "- +237\n- 9 digits", model: "m", webSearch: "used" };

describe("règle téléphonique générée par l'IA", () => {
  beforeEach(() => runProviderTextTask.mockReset());

  it("cherche sur le web puis demande un JSON strict sans outil", async () => {
    runProviderTextTask
      .mockResolvedValueOnce(notes)
      .mockResolvedValueOnce({ id: "w", text: '{"dialCode":"+237","digits":9,"example":"671234567"}', model: "m" });
    const rule = await generatePhonePrefixRule(input);
    expect(runProviderTextTask.mock.calls[0][3]).toEqual({ webSearch: true });
    expect(runProviderTextTask.mock.calls[1][3]).toEqual({ webSearch: false });
    expect(runProviderTextTask.mock.calls[1][2]).toContain("- +237");
    expect(rule).toEqual({ dialCode: "+237", digits: 9, example: "671234567", webSearch: "used" });
  });

  it("accepte un JSON entouré de texte et refuse un exemple dont la longueur ne correspond pas", async () => {
    runProviderTextTask
      .mockResolvedValueOnce(notes)
      .mockResolvedValueOnce({
        id: "1",
        text: 'Voici : {"dialCode":"+237","digits":9,"example":"6712345"}',
        model: "m",
      })
      .mockResolvedValueOnce({
        id: "2",
        text: 'Voici : {"dialCode":"+237","digits":9,"example":"671234567"} ok',
        model: "m",
      });
    expect((await generatePhonePrefixRule(input)).example).toBe("671234567");
    expect(runProviderTextTask).toHaveBeenCalledTimes(3);
  });

  it("refuse (AI_BAD_FORMAT) une réponse qui n'est jamais une règle valide", async () => {
    runProviderTextTask
      .mockResolvedValueOnce(notes)
      .mockResolvedValue({ id: "x", text: "Le Cameroun utilise +237.", model: "m" });
    await expect(generatePhonePrefixRule(input)).rejects.toThrow("AI_BAD_FORMAT");
  });

  it("les prompts donnent le pays, la convention de saisie et exigent un JSON", () => {
    expect(phoneResearchPrompt(input)).toContain("Cameroun");
    expect(phoneResearchPrompt(input)).toContain("web search tool");
    const prompt = phoneRulePrompt(input, "- note");
    expect(prompt).toContain("0708807015");
    expect(prompt).toContain("ONLY one JSON object");
    expect(prompt).toContain("- note");
  });

  it("le schéma impose indicatif, 6 à 12 chiffres et exemple de la bonne longueur", () => {
    expect(phoneRuleSchema.safeParse({ dialCode: "+225", digits: 10, example: "0708807015" }).success).toBe(true);
    expect(phoneRuleSchema.safeParse({ dialCode: "225", digits: 10, example: "0708807015" }).success).toBe(false);
    expect(phoneRuleSchema.safeParse({ dialCode: "+225", digits: 5, example: "07088" }).success).toBe(false);
    expect(phoneRuleSchema.safeParse({ dialCode: "+225", digits: 10, example: "07088070" }).success).toBe(false);
  });

  it("la demande exige un code pays à deux lettres (mis en majuscules)", () => {
    expect(phonePrefixRequestSchema.parse({ countryCode: "cm", countryName: "Cameroun" }).countryCode).toBe("CM");
    expect(phonePrefixRequestSchema.safeParse({ countryCode: "CMR", countryName: "Cameroun" }).success).toBe(false);
  });
});

describe("validation en direct des champs", () => {
  it("indicatif", () => {
    expect(checkDialCode("").state).toBe("empty");
    expect(checkDialCode("+225").state).toBe("valid");
    expect(checkDialCode("225").state).toBe("invalid");
    expect(checkDialCode("+22 5").state).toBe("invalid");
    expect(checkDialCode("+12345").state).toBe("invalid");
  });

  it("chiffres attendus", () => {
    expect(checkDigits("10").state).toBe("valid");
    expect(checkDigits("5").state).toBe("invalid");
    expect(checkDigits("13").state).toBe("invalid");
    expect(checkDigits("9.5").state).toBe("invalid");
    expect(checkDigits("").state).toBe("empty");
  });

  it("exemple : chiffres seulement et même longueur que « Chiffres attendus »", () => {
    expect(checkExample("0708807015", "10").state).toBe("valid");
    expect(checkExample("070880701", "10")).toMatchObject({ state: "invalid" });
    expect(checkExample("070880701", "10").message).toContain("9 chiffres au lieu de 10");
    expect(checkExample("07 08", "10").state).toBe("invalid");
    expect(checkExample("0708807015", "").state).toBe("valid");
    expect(checkExample("", "10").state).toBe("empty");
  });
});
