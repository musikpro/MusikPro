import { describe, expect, it } from "vitest";
import {
  demoStorySchema,
  demoRecipientSchema,
  demoLyricsSchema,
  demoDetailSchema,
  demoSupportSchema,
  buildDemoPaymentSchema,
  demoProfileSchema,
} from "@/lib/validation/musikpro-demo";

const testPhoneRules = [
  { countryCode: "CI", digits: 10, placeholder: "0708807015" },
  { countryCode: "BF", digits: 8, placeholder: "70123456" },
  { countryCode: "SN", digits: 9, placeholder: "771234567" },
];

describe("frontières des saisies de démonstration MusikPro", () => {
  it("refuse une histoire vide ou trop longue et normalise les espaces", () => {
    expect(demoStorySchema.safeParse("   ").success).toBe(false);
    expect(demoStorySchema.safeParse(Array(120).fill("mot").join(" ")).success).toBe(true);
    expect(demoStorySchema.safeParse(Array(121).fill("mot").join(" ")).success).toBe(false);
    expect(demoStorySchema.safeParse("a".repeat(1201)).success).toBe(false);
    expect(demoStorySchema.parse("  Une chanson pour ma famille  ")).toBe("Une chanson pour ma famille");
  });
  it("valide le destinataire et sa relation", () => {
    expect(
      demoRecipientSchema.safeParse({
        name: "Aïcha",
        pronunciation: "Aï-cha",
        relation: "Ma femme",
      }).success,
    ).toBe(true);
    for (const relation of ["Mon oncle", "Ma tante"]) {
      expect(
        demoRecipientSchema.safeParse({
          name: "Amadou",
          pronunciation: "A-ma-dou",
          relation,
        }).success,
      ).toBe(true);
    }
    expect(
      demoRecipientSchema.safeParse({
        name: "",
        pronunciation: "",
        relation: "",
      }).success,
    ).toBe(false);
  });
  it("borne les paroles et les détails en mots, y compris les sauts de ligne", () => {
    expect(demoLyricsSchema.safeParse(Array(900).fill("mot").join("\n")).success).toBe(true);
    expect(demoLyricsSchema.safeParse(Array(901).fill("mot").join(" ")).success).toBe(false);
    expect(demoDetailSchema.safeParse(Array(51).fill("mot").join("\n")).success).toBe(false);
    expect(demoDetailSchema.safeParse("").success).toBe(true);
  });
  it("refuse une catégorie inconnue et des coordonnées incorrectes", () => {
    const message = {
      subject: "Lecture",
      category: "Problème technique",
      message: "La lecture ne fonctionne pas.",
      email: "demo@example.com",
      phone: "+225 0102030405",
    };
    expect(demoSupportSchema.safeParse(message).success).toBe(true);
    expect(demoSupportSchema.safeParse({ ...message, category: "admin" }).success).toBe(false);
    expect(demoSupportSchema.safeParse({ ...message, email: "invalide" }).success).toBe(false);
    expect(demoSupportSchema.safeParse({ ...message, phone: "<script>" }).success).toBe(false);
  });
  it("valide le téléphone selon l’indicatif choisi", () => {
    const schema = buildDemoPaymentSchema(testPhoneRules);
    const payment = { name: "Awa Koné", email: "awa@example.com", phoneCountry: "CI", phone: "0708807015" };
    expect(schema.safeParse(payment).success).toBe(true);
    expect(schema.safeParse({ ...payment, phone: "0102" }).success).toBe(false);
    expect(schema.safeParse({ ...payment, phoneCountry: "BF", phone: "70123456" }).success).toBe(true);
    expect(schema.safeParse({ ...payment, phoneCountry: "SN", phone: "771234567" }).success).toBe(true);
    expect(schema.safeParse({ ...payment, phoneCountry: "BF", phone: "0708807015" }).success).toBe(false);
  });
  it("rejette un indicatif qui n’existe pas dans la liste fournie", () => {
    const schema = buildDemoPaymentSchema(testPhoneRules);
    const payment = { name: "Awa Koné", email: "awa@example.com", phoneCountry: "XX", phone: "12345678" };
    expect(schema.safeParse(payment).success).toBe(false);
  });
  it("ne plante pas avec une liste de préfixes vide", () => {
    const schema = buildDemoPaymentSchema([]);
    expect(
      schema.safeParse({ name: "Awa Koné", email: "awa@example.com", phoneCountry: "CI", phone: "0708807015" })
        .success,
    ).toBe(false);
  });
  it("refuse un profil incomplet et retire les propriétés hors contrat", () => {
    expect(
      demoProfileSchema.safeParse({
        name: "A",
        email: "demo@example.com",
        location: "Accra",
      }).success,
    ).toBe(false);
    expect(
      demoProfileSchema.parse({
        name: "Kofi Mensah",
        email: "demo@example.com",
        location: "Accra",
        role: "admin",
      }),
    ).not.toHaveProperty("role");
  });
});
