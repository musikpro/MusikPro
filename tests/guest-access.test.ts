import { describe, expect, it } from "vitest";
import {
  GUEST_COOKIE,
  GUEST_HEADER,
  buildGuestCookieValue,
  guestEntryPath,
  isGuestAllowedPath,
  parseGuestCookie,
} from "@/lib/guest/access";

const LINK_ID = "3f2b1c9e-4a5d-4e6f-8a7b-1c2d3e4f5a6b";
const VISITOR_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

describe("isGuestAllowedPath", () => {
  it.each([
    "/dashboard",
    "/dashboard/",
    "/dashboard/create",
    "/dashboard/create/",
    "/dashboard/create/story",
    "/dashboard/create/recipient",
    "/dashboard/create/style",
    "/dashboard/create/genre",
    "/dashboard/create/parameters",
  ])("autorise %s", (path) => {
    expect(isGuestAllowedPath(path)).toBe(true);
  });

  it.each([
    "/dashboard/credits",
    "/dashboard/songs",
    "/dashboard/songs/player",
    "/dashboard/billing",
    "/dashboard/security",
    "/dashboard/payment-preview",
    "/dashboard/payment-preview/generating",
    "/dashboard/create/lyrics",
    "/dashboard/create/lyrics/generating",
    "/dashboard/create/confirm",
    "/dashboard/create/pack",
    "/dashboard/create/story/extra",
    "/dashboard/create/../credits",
    "/dashboard/create/%2e%2e/credits",
    "/dashboard//create",
    "/DASHBOARD/create",
    "/admin",
    "/api/songs",
    "/",
    "",
  ])("refuse %s", (path) => {
    expect(isGuestAllowedPath(path)).toBe(false);
  });
});

describe("cookie invité", () => {
  it("construit puis relit la valeur", () => {
    const value = buildGuestCookieValue(LINK_ID, VISITOR_ID);
    expect(value).toBe(`${LINK_ID}.${VISITOR_ID}`);
    expect(parseGuestCookie(value)).toEqual({ linkId: LINK_ID, visitorId: VISITOR_ID });
  });

  it.each([
    undefined,
    null,
    "",
    "abc",
    `${LINK_ID}`,
    `${LINK_ID}.${VISITOR_ID}.extra`,
    `${LINK_ID}.not-a-uuid`,
    `<script>.${VISITOR_ID}`,
    `${LINK_ID.toUpperCase()}.${VISITOR_ID}`,
    `${LINK_ID}.${VISITOR_ID}\n`,
  ])("refuse la valeur %j", (value) => {
    expect(parseGuestCookie(value as string | null | undefined)).toBeNull();
  });
});

describe("guestEntryPath", () => {
  it("envoie vers le formulaire ou l'accueil selon la destination", () => {
    expect(guestEntryPath("create")).toBe("/dashboard/create");
    expect(guestEntryPath("dashboard")).toBe("/dashboard");
  });

  it("retombe sur le formulaire pour une valeur inconnue", () => {
    expect(guestEntryPath("autre")).toBe("/dashboard/create");
  });
});

describe("constantes", () => {
  it("expose les noms du cookie et de l'en-tête interne", () => {
    expect(GUEST_COOKIE).toBe("musikpro_guest");
    expect(GUEST_HEADER).toBe("x-musikpro-guest-route");
  });
});
