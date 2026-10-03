import { describe, expect, it } from "vitest";
import { isSupportedLocale, pickPageLocale, readCookieValue } from "@/lib/i18n/page-locale";
import { splitLocalePrefix } from "@/lib/languages/locale-path";

describe("pickPageLocale", () => {
  it("le préfixe d'URL gagne sur le cookie et Accept-Language", () => {
    expect(pickPageLocale({ urlCode: "en", cookie: "es", acceptLanguage: "pt-BR" })).toBe("en");
  });
  it("un préfixe d'URL non supporté donne fr (langue ajoutée par l'admin)", () => {
    expect(pickPageLocale({ urlCode: "de", cookie: "es", acceptLanguage: "pt" })).toBe("fr");
  });
  it("sans préfixe, le cookie supporté gagne sur Accept-Language", () => {
    expect(pickPageLocale({ cookie: "es", acceptLanguage: "en-US" })).toBe("es");
  });
  it("un cookie inconnu est ignoré et Accept-Language prend le relais", () => {
    expect(pickPageLocale({ cookie: "de", acceptLanguage: "pt-BR,pt;q=0.9" })).toBe("pt");
  });
  it("sans rien, retombe sur fr", () => {
    expect(pickPageLocale({})).toBe("fr");
    expect(pickPageLocale({ acceptLanguage: "ja" })).toBe("fr");
  });
  it("force fr sur /admin, même avec un cookie anglais", () => {
    expect(pickPageLocale({ pathname: "/admin/languages", cookie: "en", acceptLanguage: "en" })).toBe("fr");
    expect(pickPageLocale({ pathname: "/admin", cookie: "en" })).toBe("fr");
    expect(pickPageLocale({ pathname: "/admin?x=1", cookie: "en" })).toBe("fr");
  });
  it("ne confond pas /administration ou /adminx avec /admin", () => {
    expect(pickPageLocale({ pathname: "/administration", cookie: "en" })).toBe("en");
  });
  it("ne prend jamais une clé héritée du prototype pour une langue", () => {
    expect(isSupportedLocale("constructor")).toBe(false);
    expect(isSupportedLocale("__proto__")).toBe(false);
    expect(pickPageLocale({ urlCode: "constructor" })).toBe("fr");
    expect(pickPageLocale({ cookie: "toString", acceptLanguage: "es" })).toBe("es");
  });
});

describe("pickPageLocale /en/admin", () => {
  it("force fr aussi pour un chemin admin préfixé par une langue", () => {
    expect(pickPageLocale({ pathname: "/en/admin/languages", cookie: "en" })).toBe("fr");
    expect(pickPageLocale({ pathname: "/en/administration", cookie: "en" })).toBe("en");
  });
});

describe("readCookieValue", () => {
  it("lit une valeur parmi plusieurs cookies", () => {
    expect(readCookieValue("a=1; musikpro_lang=en; b=2", "musikpro_lang")).toBe("en");
  });
  it("renvoie undefined si absent ou en-tête vide", () => {
    expect(readCookieValue("a=1", "musikpro_lang")).toBeUndefined();
    expect(readCookieValue(null, "musikpro_lang")).toBeUndefined();
    expect(readCookieValue("", "musikpro_lang")).toBeUndefined();
  });
  it("ne se laisse pas tromper par un nom qui se termine pareil", () => {
    expect(readCookieValue("x_musikpro_lang=fr", "musikpro_lang")).toBeUndefined();
  });
  it("ne lève pas sur un encodage pourcentage mal formé", () => {
    expect(() => readCookieValue("musikpro_lang=%E0%A4%A", "musikpro_lang")).not.toThrow();
    expect(isSupportedLocale(readCookieValue("musikpro_lang=%E0%A4%A", "musikpro_lang"))).toBe(false);
  });
  it("décode une valeur encodée valide", () => {
    expect(readCookieValue("musikpro_lang=en%20", "musikpro_lang")).toBe("en ");
  });
});

describe("pickPageLocale pages publiques /s et 404", () => {
  it("/s n'a jamais de préfixe : cookie puis Accept-Language (même règle que <html lang>)", () => {
    expect(splitLocalePrefix("/en/s/abc")).toEqual({ locale: null, path: "/en/s/abc" });
    expect(pickPageLocale({ pathname: "/s/abc", cookie: "pt", acceptLanguage: "en-US" })).toBe("pt");
    expect(pickPageLocale({ pathname: "/s/abc", acceptLanguage: "es-ES,es;q=0.9" })).toBe("es");
    expect(pickPageLocale({ pathname: "/s/abc" })).toBe("fr");
  });
});
