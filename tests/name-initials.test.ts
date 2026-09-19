import { describe, expect, it } from "vitest";
import { getNameInitials } from "@/lib/profile/name-initials";

describe("profile initials", () => {
  it("uses the first two name parts", () => {
    expect(getNameInitials("Ballo Issa")).toBe("BI");
    expect(getNameInitials("Ballo Awa")).toBe("BA");
    expect(getNameInitials("  Konaté   Afou  ")).toBe("KA");
  });

  it("always provides two letters for a single name or the fallback", () => {
    expect(getNameInitials("Ballo")).toBe("BA");
    expect(getNameInitials("")).toBe("MP");
  });
});
