import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/admin/occasion-fields/actions.ts", "utf8");

describe("occasion-fields actions", () => {
  it("is a server-actions module and uses the shared toast state", () => {
    expect(source.startsWith('"use server"')).toBe(true);
    expect(source).toContain("AdminActionState");
    expect(source).toContain("actionErrorMessage");
  });

  it("redirects only through withAdminNotice, never inside a try block", () => {
    expect(source).not.toMatch(/redirect\(\s*["'`]/);
    const redirects = [...source.matchAll(/redirect\(withAdminNotice/g)].length;
    expect(redirects).toBeGreaterThan(0);
  });

  it("caps active fields per occasion", () => {
    expect(source).toContain("MAX_ACTIVE_FIELDS_PER_OCCASION");
  });

  it("revalidates the admin and the client creation pages", () => {
    expect(source).toContain('revalidatePath("/admin/occasion-fields")');
    expect(source).toContain('revalidatePath("/dashboard/create/recipient")');
    expect(source).toContain('revalidatePath("/demo/create/recipient")');
  });

  it("adds AI-proposed fields with a full server-side revalidation", () => {
    expect(source).toContain("export async function addProposedFields");
    expect(source).toContain("occasionFieldFormSchema.parse(");
  });
});
