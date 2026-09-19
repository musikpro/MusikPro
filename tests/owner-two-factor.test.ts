import { describe, expect, it } from "vitest";
import { maskEmail } from "@/lib/auth/owner-two-factor";

describe("owner two-factor challenge", () => {
  it("masks the mailbox while keeping the destination recognizable", () => {
    expect(maskEmail("musikpro2026@gmail.com")).toBe("mu••••••••••@gmail.com");
    expect(maskEmail("a@example.com")).toBe("a•••@example.com");
  });

  it("does not expose malformed input", () => {
    expect(maskEmail("private-value")).toBe("••••••");
  });
});
