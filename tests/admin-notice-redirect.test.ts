import { describe, expect, it } from "vitest";
import { withAdminNotice } from "@/lib/admin/notice-redirect";

describe("withAdminNotice", () => {
  it("appends the notice as query params on a path with none", () => {
    expect(withAdminNotice("/admin/languages", "Langue ajoutée.")).toBe(
      "/admin/languages?admin_notice=Langue%20ajout%C3%A9e.&admin_notice_tone=success",
    );
  });

  it("uses & to extend a path that already has query params", () => {
    expect(withAdminNotice("/admin/languages?tab=x", "Erreur", "error")).toBe(
      "/admin/languages?tab=x&admin_notice=Erreur&admin_notice_tone=error",
    );
  });

  it("defaults the tone to success when omitted", () => {
    expect(withAdminNotice("/admin/languages", "OK")).toContain("admin_notice_tone=success");
  });
});
