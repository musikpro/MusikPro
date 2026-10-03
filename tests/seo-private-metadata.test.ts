import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetOverlayForTests, setOverlay } from "@/lib/i18n/overlay";
import { getPrivatePageMetadata } from "@/lib/seo/metadata";

describe("getPrivatePageMetadata", () => {
  beforeEach(() => resetOverlayForTests());
  afterEach(() => resetOverlayForTests());

  it("conserve robots noindex dans toutes les langues", () => {
    for (const locale of ["fr", "en", "es", "pt"] as const) {
      expect(getPrivatePageMetadata(locale).robots).toMatchObject({ index: false });
    }
  });
  it("renvoie le français pour fr et sans traduction disponible", () => {
    expect(String(getPrivatePageMetadata("fr").title)).toContain("Espace privé");
    expect(getPrivatePageMetadata("fr").description).toBe("Espace privé du SaaS.");
  });
  it("traduit le titre quand l'overlay est amorcé pour la locale", () => {
    setOverlay("en", { "Espace privé": "Private area", "Espace privé du SaaS.": "Private area of the SaaS." });
    const meta = getPrivatePageMetadata("en");
    expect(String(meta.title)).toContain("Private area");
    expect(String(meta.title)).not.toContain("Espace privé");
    expect(meta.description).toBe("Private area of the SaaS.");
    expect(meta.robots).toMatchObject({ index: false });
  });
});
