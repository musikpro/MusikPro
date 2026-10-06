import { describe, expect, it } from "vitest";
import { authEmailText, localeFromRequest } from "@/lib/email/auth-email-text";

const req = (headers: Record<string, string>) => new Request("https://x.test", { headers });

describe("authEmailText", () => {
  it("renvoie le français actuel, mot pour mot, pour fr", () => {
    expect(authEmailText("reset", "fr")).toEqual({
      subject: "Réinitialiser votre mot de passe",
      title: "Réinitialisation du mot de passe",
      actionLabel: "Choisir un nouveau mot de passe",
      intro: "Cette demande concerne votre compte {brand}.",
      ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    });
    expect(authEmailText("verify", "fr").subject).toBe("Vérifiez votre adresse e-mail");
    expect(authEmailText("verify", "fr").actionLabel).toBe("Vérifier mon e-mail");
  });
  it("décrit la suppression de compte : sujet, bouton et avertissement de définitivité", () => {
    const text = authEmailText("delete", "fr");
    expect(text.subject).toBe("Confirmer la suppression de votre compte");
    expect(text.actionLabel).toBe("Supprimer définitivement mon compte");
    expect(text.intro).toContain("{brand}");
    expect(text.intro).toContain("définitive");
    expect(text.ignore).toContain("votre compte restera intact");
  });
  it("retombe sur le français quand aucune traduction n'est connue", () => {
    expect(authEmailText("verify", "es").title).toBe("Confirmez votre adresse e-mail");
  });
});

describe("localeFromRequest", () => {
  it("lit le cookie musikpro_lang puis Accept-Language", () => {
    expect(localeFromRequest(req({ cookie: "musikpro_lang=en" }))).toBe("en");
    expect(localeFromRequest(req({ "accept-language": "pt-BR" }))).toBe("pt");
  });
  it("le cookie prime sur Accept-Language", () => {
    expect(localeFromRequest(req({ cookie: "a=b; musikpro_lang=es", "accept-language": "en" }))).toBe("es");
  });
  it("langue inconnue ou absente : fr", () => {
    expect(localeFromRequest(req({ cookie: "musikpro_lang=xx" }))).toBe("fr");
    expect(localeFromRequest(req({ "accept-language": "ja" }))).toBe("fr");
    expect(localeFromRequest(req({}))).toBe("fr");
  });
  it("cookie mal encodé (%E0%A4%A) : fr sans lever d'erreur", () => {
    expect(localeFromRequest(req({ cookie: "musikpro_lang=%E0%A4%A" }))).toBe("fr");
  });
  it("renvoie fr sans requête", () => {
    expect(localeFromRequest(undefined)).toBe("fr");
  });
});
