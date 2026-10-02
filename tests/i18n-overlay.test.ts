import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOverlayEntry,
  getOverlayVersion,
  resetOverlayForTests,
  setOverlay,
  subscribeOverlay,
} from "@/lib/i18n/overlay";
import { overlayLocaleSchema } from "@/lib/i18n/overlay-schema";
import { translateForLocale } from "@/lib/i18n/translate";

beforeEach(() => resetOverlayForTests());

describe("overlay store", () => {
  it("returns an entry only for texts it owns", () => {
    setOverlay("en", { "Texte inédit": "Brand new text" });
    expect(getOverlayEntry("en", "Texte inédit")).toBe("Brand new text");
    expect(getOverlayEntry("es", "Texte inédit")).toBeUndefined();
    expect(getOverlayEntry("en", "constructor")).toBeUndefined();
    expect(getOverlayEntry("en", "__proto__")).toBeUndefined();
  });

  it("notifies subscribers and bumps the version on every set", () => {
    const listener = vi.fn();
    const stop = subscribeOverlay(listener);
    const before = getOverlayVersion();
    setOverlay("pt", { A: "a" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getOverlayVersion()).toBe(before + 1);
    stop();
    setOverlay("pt", { A: "b" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("translateForLocale with the overlay", () => {
  it("keeps French untouched", () => {
    setOverlay("en", { Bonjour: "Hello!" });
    expect(translateForLocale("Bonjour", "fr")).toBe("Bonjour");
  });

  it("falls back to the overlay when the JSON dictionary has no entry", () => {
    setOverlay("en", { "Texte inédit": "Brand new text" });
    expect(translateForLocale("Texte inédit", "en")).toBe("Brand new text");
  });

  it("prefers the JSON dictionary over the overlay", () => {
    const jsonKey = "Mes paroles"; // present in lib/i18n/locales/en.json
    setOverlay("en", { [jsonKey]: "OVERLAY" });
    expect(translateForLocale(jsonKey, "en")).not.toBe("OVERLAY");
  });

  it("falls back to French when nobody knows the text", () => {
    expect(translateForLocale("Texte totalement inconnu", "es")).toBe("Texte totalement inconnu");
  });
});

describe("overlayLocaleSchema", () => {
  it("accepts en/es/pt only", () => {
    expect(overlayLocaleSchema.safeParse("en").success).toBe(true);
    expect(overlayLocaleSchema.safeParse("fr").success).toBe(false);
    expect(overlayLocaleSchema.safeParse("de").success).toBe(false);
    expect(overlayLocaleSchema.safeParse(null).success).toBe(false);
  });
});
