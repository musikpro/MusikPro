import { describe, expect, it } from "vitest";
import { fitProviderTitle, PROVIDER_TITLE_MAX_LENGTH } from "@/lib/ai/song-title";

describe("fitProviderTitle", () => {
  it("laisse intact un titre qui tient dans la limite du fournisseur", () => {
    const title = "Anniversaire — Afrobeats / Naija Pop — octobre 2026 — Version 1";
    expect(fitProviderTitle(title)).toBe(title);
  });

  it("raccourcit à 80 caractères le titre de 81 caractères qui provoquait un HTTP 422", () => {
    const title = "Princesse zogbé — Anniversaire — Afrobeats / Naija Pop — octobre 2026 — Version 1";
    expect(title).toHaveLength(81);
    const fitted = fitProviderTitle(title);
    expect(fitted.length).toBeLessThanOrEqual(PROVIDER_TITLE_MAX_LENGTH);
    expect(title.startsWith(fitted)).toBe(true);
  });

  it("ne laisse pas d'espace final après la coupure", () => {
    expect(fitProviderTitle(`${"a".repeat(79)} bbb`)).toBe("a".repeat(79));
  });
});
