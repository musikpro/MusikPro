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

describe("schémas push", () => {
  const token = "a".repeat(40);
  it("accepte un appareil Android valide et applique la langue par défaut", async () => {
    const { pushDeviceRegisterSchema } = await import("@/lib/validation/notifications");
    expect(pushDeviceRegisterSchema.parse({ token, platform: "android" }).locale).toBe("fr");
  });
  it("refuse jeton court/étrange, plateforme inconnue, champ en trop", async () => {
    const { pushDeviceRegisterSchema, pushDeviceRemoveSchema, notificationPreferencesSchema } =
      await import("@/lib/validation/notifications");
    expect(pushDeviceRegisterSchema.safeParse({ token: "court", platform: "android" }).success).toBe(false);
    expect(pushDeviceRegisterSchema.safeParse({ token: `${token} x`, platform: "android" }).success).toBe(false);
    expect(pushDeviceRegisterSchema.safeParse({ token, platform: "windows" }).success).toBe(false);
    expect(pushDeviceRegisterSchema.safeParse({ token, platform: "ios", extra: 1 }).success).toBe(false);
    expect(pushDeviceRemoveSchema.safeParse({ token }).success).toBe(true);
    expect(notificationPreferencesSchema.safeParse({ songReady: "oui" }).success).toBe(false);
    expect(notificationPreferencesSchema.safeParse({ songReady: false }).success).toBe(true);
  });
});
