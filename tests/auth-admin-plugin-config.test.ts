import { describe, expect, it } from "vitest";
import { admin } from "better-auth/plugins";

/**
 * better-auth's admin plugin validates `adminRoles` at construction time against its `roles`
 * (access-control) option, which this project does not use — any value other than the plugin's
 * own default ("admin"/"user") throws, regardless of what lib/auth/index.ts's own role model
 * allows. This pins that library behavior so nobody "fixes" a TypeScript error by widening
 * adminRoles to the 5 admin roles again (that exact change previously crashed auth entirely —
 * see docs/superpowers/specs/2026-09-26-admin-roles-permissions-design.md).
 */
describe("better-auth admin plugin adminRoles validation", () => {
  it("accepts the config actually shipped in lib/auth/index.ts", () => {
    expect(() => admin({ defaultRole: "user", adminRoles: ["admin"] })).not.toThrow();
  });

  it("throws when adminRoles includes a value outside its defaults (why we can't just widen it)", () => {
    expect(() =>
      admin({
        defaultRole: "user",
        adminRoles: ["admin", "admin_content", "admin_payments", "support", "moderator"],
      }),
    ).toThrow(/Invalid admin roles/);
  });
});
