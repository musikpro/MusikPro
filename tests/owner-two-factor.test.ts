import { describe, expect, it } from "vitest";
import {
  isSocialSignInPath,
  maskEmail,
  ownerTwoFactorEnabled,
  shouldBootstrapOwnerTwoFactor,
} from "@/lib/auth/owner-two-factor";

describe("owner two-factor challenge", () => {
  it("masks the mailbox while keeping the destination recognizable", () => {
    expect(maskEmail("musikpro2026@gmail.com")).toBe("mu••••••••••@gmail.com");
    expect(maskEmail("a@example.com")).toBe("a•••@example.com");
  });

  it("does not expose malformed input", () => {
    expect(maskEmail("private-value")).toBe("••••••");
  });

  it("starts email 2FA automatically only for an owner who has not enabled it", () => {
    expect(shouldBootstrapOwnerTwoFactor({ role: "admin", twoFactorEnabled: false }, true)).toBe(true);
    expect(shouldBootstrapOwnerTwoFactor({ role: "admin", twoFactorEnabled: true }, true)).toBe(false);
    expect(shouldBootstrapOwnerTwoFactor({ role: "user", twoFactorEnabled: false }, true)).toBe(false);
    expect(shouldBootstrapOwnerTwoFactor({ role: "admin", twoFactorEnabled: false }, false)).toBe(false);
  });

  it("covers every admin-type account but never clients", () => {
    expect(shouldBootstrapOwnerTwoFactor({ role: "support", twoFactorEnabled: null }, true)).toBe(true);
    expect(shouldBootstrapOwnerTwoFactor({ role: "custom:abc" }, true, ["custom:abc"])).toBe(true);
    expect(shouldBootstrapOwnerTwoFactor({ role: "custom:abc" }, true)).toBe(false);
  });

  it("recognises the Google sign-in endpoints", () => {
    expect(isSocialSignInPath("/callback/:id")).toBe(true);
    expect(isSocialSignInPath("/callback/google")).toBe(true);
    expect(isSocialSignInPath("/sign-in/social")).toBe(true);
    expect(isSocialSignInPath("/sign-in/email")).toBe(false);
  });

  it("keeps owner 2FA disabled unless explicitly enabled", () => {
    expect(ownerTwoFactorEnabled(undefined)).toBe(false);
    expect(ownerTwoFactorEnabled("false")).toBe(false);
    expect(ownerTwoFactorEnabled("true")).toBe(true);
  });
});
