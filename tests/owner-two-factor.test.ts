import { describe, expect, it } from "vitest";
import { maskEmail, shouldBootstrapOwnerTwoFactor } from "@/lib/auth/owner-two-factor";

describe("owner two-factor challenge", () => {
  it("masks the mailbox while keeping the destination recognizable", () => {
    expect(maskEmail("musikpro2026@gmail.com")).toBe("mu••••••••••@gmail.com");
    expect(maskEmail("a@example.com")).toBe("a•••@example.com");
  });

  it("does not expose malformed input", () => {
    expect(maskEmail("private-value")).toBe("••••••");
  });

  it("starts email 2FA automatically only for an owner who has not enabled it", () => {
    expect(shouldBootstrapOwnerTwoFactor({ role: "admin", twoFactorEnabled: false })).toBe(true);
    expect(shouldBootstrapOwnerTwoFactor({ role: "user,admin", twoFactorEnabled: null })).toBe(true);
    expect(shouldBootstrapOwnerTwoFactor({ role: "admin", twoFactorEnabled: true })).toBe(false);
    expect(shouldBootstrapOwnerTwoFactor({ role: "user", twoFactorEnabled: false })).toBe(false);
  });
});
