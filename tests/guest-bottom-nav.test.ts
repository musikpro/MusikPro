import { describe, expect, it } from "vitest";
import { shouldHideBottomNav } from "@/lib/guest/bottom-nav";

describe("shouldHideBottomNav", () => {
  it.each([
    "/dashboard/credits",
    "/dashboard/payment-preview",
    "/dashboard/payment-preview/chariow",
    "/dashboard/payment-preview/generating",
  ])("masque la barre sur %s pour un visiteur venu d'un lien invité", (pathname) => {
    expect(shouldHideBottomNav({ guestOrigin: true, pathname })).toBe(true);
  });

  it.each([
    "/dashboard",
    "/dashboard/songs",
    "/dashboard/discover",
    "/dashboard/create",
    "/dashboard/create/story",
    "/dashboard/profile",
    "/dashboard/credits-history",
    "/dashboard/creditsx",
  ])("garde la barre sur %s même pour un visiteur venu d'un lien invité", (pathname) => {
    expect(shouldHideBottomNav({ guestOrigin: true, pathname })).toBe(false);
  });

  it.each(["/dashboard/credits", "/dashboard/payment-preview", "/dashboard"])(
    "garde toujours la barre sur %s pour un compte ordinaire",
    (pathname) => {
      expect(shouldHideBottomNav({ guestOrigin: false, pathname })).toBe(false);
    },
  );
});
