import { describe, expect, it } from "vitest";
import { hasAppRole, hasOrganizationRole } from "@/lib/auth/permissions";

describe("access-control helpers", () => {
  it("n'accorde pas admin à un utilisateur standard", () => {
    expect(hasAppRole("user", "admin")).toBe(false);
    expect(hasAppRole("admin", "admin")).toBe(true);
  });

  it("respecte les rôles d'organisation autorisés", () => {
    expect(hasOrganizationRole("member", ["owner", "admin"])).toBe(false);
    expect(hasOrganizationRole("admin", ["owner", "admin"])).toBe(true);
    expect(hasOrganizationRole("owner", ["owner"])).toBe(true);
  });
});
