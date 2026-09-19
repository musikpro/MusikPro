import { describe, expect, it } from "vitest";
import {
  demoStorySchema,
  demoLyricsSchema,
  demoDetailSchema,
  demoSupportSchema,
  demoPaymentSchema,
  demoProfileSchema,
} from "@/lib/validation/musikpro-demo";

describe("frontières des saisies de démonstration MusikPro", () => {
  it("refuse une histoire vide ou trop longue et normalise les espaces", () => {
    expect(demoStorySchema.safeParse("   ").success).toBe(false);
    expect(demoStorySchema.safeParse(Array(250).fill("mot").join(" ")).success).toBe(true);
    expect(demoStorySchema.safeParse(Array(251).fill("mot").join(" ")).success).toBe(false);
    expect(demoStorySchema.safeParse("a".repeat(2001)).success).toBe(false);
    expect(demoStorySchema.parse("  Une chanson pour ma famille  ")).toBe(
      "Une chanson pour ma famille",
    );
  });
  it("borne les paroles et les détails en mots, y compris les sauts de ligne", () => {
    expect(
      demoLyricsSchema.safeParse(Array(500).fill("mot").join("\n")).success,
    ).toBe(true);
    expect(
      demoLyricsSchema.safeParse(Array(501).fill("mot").join(" ")).success,
    ).toBe(false);
    expect(
      demoDetailSchema.safeParse(Array(51).fill("mot").join("\n")).success,
    ).toBe(false);
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
    expect(
      demoSupportSchema.safeParse({ ...message, category: "admin" }).success,
    ).toBe(false);
    expect(
      demoSupportSchema.safeParse({ ...message, email: "invalide" }).success,
    ).toBe(false);
    expect(
      demoSupportSchema.safeParse({ ...message, phone: "<script>" }).success,
    ).toBe(false);
  });
  it("valide dix chiffres pour la maquette de paiement sans accepter un numéro partiel", () => {
    const payment = {
      name: "Jean Dupont",
      email: "demo@example.com",
      phone: "0102030405",
    };
    expect(demoPaymentSchema.safeParse(payment).success).toBe(true);
    expect(
      demoPaymentSchema.safeParse({ ...payment, phone: "0102" }).success,
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
