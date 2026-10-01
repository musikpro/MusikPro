import { describe, expect, it } from "vitest";
import { setStoreLinksSchema } from "@/lib/validation/store-links";

const base = { googlePlayUrl: "", appStoreUrl: "" };

describe("setStoreLinksSchema — hideInApp (case à cocher)", () => {
  it("coché : « on » → vrai", () => {
    expect(setStoreLinksSchema.parse({ ...base, hideInApp: "on" }).hideInApp).toBe(true);
  });

  it("décoché : champ absent du FormData (null) → faux", () => {
    expect(setStoreLinksSchema.parse({ ...base, hideInApp: null }).hideInApp).toBe(false);
  });

  it("valeur inattendue → faux (jamais de masquage par accident)", () => {
    expect(setStoreLinksSchema.parse({ ...base, hideInApp: "peut-etre" }).hideInApp).toBe(false);
  });

  it("conserve la règle https:// sur les liens", () => {
    expect(() =>
      setStoreLinksSchema.parse({ googlePlayUrl: "http://x.test", appStoreUrl: "", hideInApp: "on" }),
    ).toThrow();
  });
});
