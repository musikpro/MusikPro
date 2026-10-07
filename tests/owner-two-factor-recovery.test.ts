import { describe, expect, it } from "vitest";
import { backupCodesFileContent, totpSetupKey } from "@/lib/auth/backup-codes-file";
import { backupCodeSchema, ownerTwoFactorContextSchema, twoFactorBackupCodeSchema } from "@/lib/validation/auth";

describe("code de secours du double facteur", () => {
  it("accepte un code de secours au format Better Auth", () => {
    expect(backupCodeSchema.safeParse("abcde-12345").success).toBe(true);
    expect(twoFactorBackupCodeSchema.parse({ code: "  Ab3dE-12345  " }).code).toBe("Ab3dE-12345");
  });

  it("refuse les valeurs vides, trop longues ou avec des caractères interdits", () => {
    expect(backupCodeSchema.safeParse("").success).toBe(false);
    expect(backupCodeSchema.safeParse("abc").success).toBe(false);
    expect(backupCodeSchema.safeParse("a".repeat(40)).success).toBe(false);
    expect(backupCodeSchema.safeParse("abcde 12345").success).toBe(false);
    expect(backupCodeSchema.safeParse("abcde-1234<script>").success).toBe(false);
  });

  it("accepte la méthode backup dans le contexte propriétaire", () => {
    const base = { email: "mu••••@gmail.com", expiresAt: new Date().toISOString() };
    expect(ownerTwoFactorContextSchema.safeParse({ ...base, methods: ["totp", "otp", "backup"] }).success).toBe(true);
    expect(ownerTwoFactorContextSchema.safeParse({ ...base, methods: ["sms"] }).success).toBe(false);
  });
});

describe("fichier des codes de secours et clé de configuration", () => {
  it("liste les codes numérotés sans autre secret", () => {
    const content = backupCodesFileContent(
      ["aaaaa-11111", "bbbbb-22222"],
      "MusikPro",
      new Date("2026-10-07T10:00:00Z"),
    );
    expect(content).toContain("Générés le 2026-10-07");
    expect(content).toContain("01. aaaaa-11111");
    expect(content).toContain("02. bbbbb-22222");
    expect(content).not.toMatch(/mot de passe\s*:/i);
  });

  it("extrait la clé TOTP en groupes de 4, ou null sans clé", () => {
    expect(totpSetupKey("otpauth://totp/MusikPro:a@b.c?secret=JBSWY3DPEHPK3PXP&issuer=MusikPro")).toBe(
      "JBSW Y3DP EHPK 3PXP",
    );
    expect(totpSetupKey("otpauth://totp/x?issuer=y")).toBeNull();
    expect(totpSetupKey("pas une uri")).toBeNull();
  });
});
