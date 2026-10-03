import { describe, expect, it } from "vitest";
import { formatLegalDate, pickLegalLocale, splitEmailTemplate } from "@/lib/i18n/legal-locale";

describe("pickLegalLocale", () => {
  it("force le français quand lang vaut exactement fr", () => {
    expect(pickLegalLocale("en", "fr")).toBe("fr");
  });
  it("ignore toute autre valeur (casse, inconnu, tableau, absence)", () => {
    expect(pickLegalLocale("en", "FR")).toBe("en");
    expect(pickLegalLocale("es", "xx")).toBe("es");
    expect(pickLegalLocale("pt", ["fr", "en"])).toBe("pt");
    expect(pickLegalLocale("en", undefined)).toBe("en");
    expect(pickLegalLocale("fr", "en")).toBe("fr");
  });
});

describe("formatLegalDate", () => {
  it("reste identique au texte français actuel", () => {
    expect(formatLegalDate("fr")).toBe("19 septembre 2026");
  });
  it("formate dans les autres langues sans décalage de fuseau", () => {
    expect(formatLegalDate("en")).toMatch(/19/);
    expect(formatLegalDate("en")).toMatch(/September/);
    expect(formatLegalDate("es")).toMatch(/septiembre/);
    expect(formatLegalDate("pt")).toMatch(/setembro/);
  });
});

describe("splitEmailTemplate", () => {
  it("découpe autour du marqueur", () => {
    expect(splitEmailTemplate("écrivez à {email}. Merci")).toEqual(["écrivez à ", ". Merci"]);
  });
  it("renvoie null quand le marqueur est absent (traduction qui l'a perdu)", () => {
    expect(splitEmailTemplate("write to us")).toBeNull();
  });
  it("ne découpe qu'au premier marqueur", () => {
    expect(splitEmailTemplate("a {email} b {email} c")).toEqual(["a ", " b {email} c"]);
  });
});
