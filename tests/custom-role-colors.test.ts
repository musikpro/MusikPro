import { describe, expect, it } from "vitest";
import { CUSTOM_ROLE_COLORS, CUSTOM_ROLE_COLOR_HEX } from "@/lib/auth/custom-role-colors";

describe("CUSTOM_ROLE_COLORS", () => {
  it("has exactly 6 named colors", () => {
    expect(CUSTOM_ROLE_COLORS).toHaveLength(6);
  });

  it("has a hex value for every color, and no orphan hex entries", () => {
    for (const color of CUSTOM_ROLE_COLORS) {
      expect(CUSTOM_ROLE_COLOR_HEX[color]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    expect(Object.keys(CUSTOM_ROLE_COLOR_HEX).sort()).toEqual([...CUSTOM_ROLE_COLORS].sort());
  });
});
