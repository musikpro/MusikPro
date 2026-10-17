import { describe, expect, it } from "vitest";
import { buildPageViewEvent, isBotUserAgent, pageUrl } from "@/lib/meta-capi/event";
import { metaBeaconSchema, metaCapiFormSchema } from "@/lib/validation/meta-capi";

describe("pageUrl", () => {
  it("construit l'adresse depuis l'origine du site", () => {
    expect(pageUrl("https://musikpro.net", "/fr")).toBe("https://musikpro.net/fr");
  });
  it.each([["/admin"], ["/admin/users"], ["/demo"], ["/api/x"], ["//evil.example/x"]])("refuse %s", (path) => {
    expect(pageUrl("https://musikpro.net", path)).toBeNull();
  });
});

describe("isBotUserAgent", () => {
  it("reconnaît les robots et l'absence de user-agent", () => {
    expect(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBotUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1")).toBe(false);
  });
});

describe("buildPageViewEvent", () => {
  const base = {
    eventId: "abc-12345678",
    url: "https://musikpro.net/fr",
    ip: "1.2.3.4",
    userAgent: "UA",
    nowMs: 1_700_000_000_000,
  };
  it("remplit l'événement et reprend fbp/fbc valides", () => {
    const event = buildPageViewEvent({
      ...base,
      fbp: "fb.1.1700000000000.123456789",
      fbc: "fb.1.1700000000000.AbC_d-1",
    });
    expect(event).toMatchObject({
      event_name: "PageView",
      event_time: 1_700_000_000,
      event_id: "abc-12345678",
      action_source: "website",
      user_data: {
        client_ip_address: "1.2.3.4",
        client_user_agent: "UA",
        fbp: "fb.1.1700000000000.123456789",
        fbc: "fb.1.1700000000000.AbC_d-1",
      },
    });
  });
  it("ignore fbp/fbc mal formés et une IP inconnue", () => {
    const event = buildPageViewEvent({ ...base, ip: "unknown", fbp: "<script>", fbc: "x" });
    expect(event.user_data).toEqual({ client_user_agent: "UA" });
  });
});

describe("metaBeaconSchema", () => {
  it("accepte une page vue valide", () => {
    expect(metaBeaconSchema.safeParse({ eventName: "PageView", eventId: "abcdef12-3456", path: "/fr" }).success).toBe(
      true,
    );
  });
  it.each([
    [{ eventName: "Purchase", eventId: "abcdef12-3456", path: "/fr" }],
    [{ eventName: "PageView", eventId: "x", path: "/fr" }],
    [{ eventName: "PageView", eventId: "abcdef12-3456", path: "https://evil.example" }],
    [{ eventName: "PageView", eventId: "abcdef12-3456", path: "/a b" }],
  ])("refuse %j", (payload) => {
    expect(metaBeaconSchema.safeParse(payload).success).toBe(false);
  });
});

describe("metaCapiFormSchema", () => {
  it("accepte un formulaire complet et laisse vide = null", () => {
    const parsed = metaCapiFormSchema.parse({
      enabled: "on",
      pixelId: "2385967322143642",
      token: "",
      testEventCode: "TEST70629",
    });
    expect(parsed).toEqual({ enabled: true, pixelId: "2385967322143642", token: null, testEventCode: "TEST70629" });
  });
  it.each([
    [{ pixelId: "abc" }],
    [{ token: "court" }],
    [{ token: "a b c d e f g h i j k l m n o p" }],
    [{ testEventCode: "TEST 1" }],
  ])("refuse %j", (payload) => {
    expect(metaCapiFormSchema.safeParse(payload).success).toBe(false);
  });
});
