import { describe, expect, it } from "vitest";
import { isInternalNotificationHref, notificationsReadSchema } from "@/lib/validation/notifications";

describe("notificationsReadSchema", () => {
  it("accepte « tout » ou une liste d'identifiants", () => {
    expect(notificationsReadSchema.safeParse({ all: true }).success).toBe(true);
    expect(notificationsReadSchema.safeParse({ ids: ["a", "b"] }).success).toBe(true);
  });
  it("refuse le vide, le trop long, les champs inconnus et all=false", () => {
    expect(notificationsReadSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(notificationsReadSchema.safeParse({ ids: Array(51).fill("a") }).success).toBe(false);
    expect(notificationsReadSchema.safeParse({ all: false }).success).toBe(false);
    expect(notificationsReadSchema.safeParse({ all: true, extra: 1 }).success).toBe(false);
    expect(notificationsReadSchema.safeParse(null).success).toBe(false);
  });
});

describe("isInternalNotificationHref", () => {
  it("n'accepte que des chemins internes", () => {
    expect(isInternalNotificationHref("/dashboard/songs")).toBe(true);
    expect(isInternalNotificationHref("//evil.com")).toBe(false);
    expect(isInternalNotificationHref("https://evil.com")).toBe(false);
    expect(isInternalNotificationHref("javascript:alert(1)")).toBe(false);
    expect(isInternalNotificationHref(null)).toBe(false);
  });
});
