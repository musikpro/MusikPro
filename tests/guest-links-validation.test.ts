import { describe, expect, it } from "vitest";
import {
  guestLinkDestinationSchema,
  guestLinkFormSchema,
  guestLinkPath,
  guestLinkSlugSchema,
  guestLinkUrl,
} from "@/lib/validation/guest-links";

describe("guestLinkSlugSchema", () => {
  it("accepte un slug simple et le met en minuscules", () => {
    expect(guestLinkSlugSchema.parse("  Pub-Facebook-1 ")).toBe("pub-facebook-1");
  });

  it.each([
    "ab",
    "a".repeat(41),
    "avec espace",
    "accentué",
    "-debut",
    "fin-",
    "double--tiret",
    "a/b",
    "a_b",
    "../x",
    "",
  ])("refuse %j", (value) => {
    expect(guestLinkSlugSchema.safeParse(value).success).toBe(false);
  });
});

describe("guestLinkDestinationSchema", () => {
  it("accepte uniquement create et dashboard", () => {
    expect(guestLinkDestinationSchema.parse("create")).toBe("create");
    expect(guestLinkDestinationSchema.parse("dashboard")).toBe("dashboard");
    expect(guestLinkDestinationSchema.safeParse("admin").success).toBe(false);
    expect(guestLinkDestinationSchema.safeParse("").success).toBe(false);
  });
});

describe("guestLinkFormSchema", () => {
  const valid = { label: "Pub TikTok octobre", slug: "tiktok-octobre", destination: "create", active: "true" };

  it("convertit le formulaire (actif en booléen, note par défaut vide)", () => {
    expect(guestLinkFormSchema.parse(valid)).toEqual({
      label: "Pub TikTok octobre",
      slug: "tiktok-octobre",
      destination: "create",
      active: true,
      note: "",
    });
  });

  it("refuse un libellé trop court, une destination inconnue ou un état invalide", () => {
    expect(guestLinkFormSchema.safeParse({ ...valid, label: "x" }).success).toBe(false);
    expect(guestLinkFormSchema.safeParse({ ...valid, destination: "home" }).success).toBe(false);
    expect(guestLinkFormSchema.safeParse({ ...valid, active: "oui" }).success).toBe(false);
  });

  it("borne la note", () => {
    expect(guestLinkFormSchema.safeParse({ ...valid, note: "n".repeat(241) }).success).toBe(false);
  });
});

describe("guestLinkPath / guestLinkUrl", () => {
  it("construit le chemin public et l'URL complète sans double barre", () => {
    expect(guestLinkPath("pub-1")).toBe("/g/pub-1");
    expect(guestLinkUrl("https://musikpro.net/", "pub-1")).toBe("https://musikpro.net/g/pub-1");
    expect(guestLinkUrl("https://musikpro.net", "pub-1")).toBe("https://musikpro.net/g/pub-1");
  });
});
