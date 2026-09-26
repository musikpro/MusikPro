import { describe, expect, it } from "vitest";
import { customRoleFormSchema, readCustomRoleForm } from "@/lib/validation/custom-roles";

function formDataOf(fields: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) for (const v of value) fd.append(key, v);
    else fd.set(key, value);
  }
  return fd;
}

describe("customRoleFormSchema", () => {
  it("accepts a minimal valid role", () => {
    const result = customRoleFormSchema.parse({ name: "Éditeur", color: "orange", permissions: ["users"] });
    expect(result).toEqual({ name: "Éditeur", description: "", color: "orange", permissions: ["users"] });
  });

  it("rejects a name shorter than 2 characters", () => {
    expect(() => customRoleFormSchema.parse({ name: "A", color: "orange", permissions: [] })).toThrow();
  });

  it("rejects a color outside the 6 allowed values", () => {
    expect(() => customRoleFormSchema.parse({ name: "Éditeur", color: "turquoise", permissions: [] })).toThrow();
  });

  it("rejects a permission that isn't one of the 7 real modules", () => {
    expect(() =>
      customRoleFormSchema.parse({ name: "Éditeur", color: "orange", permissions: ["activity_logs"] }),
    ).toThrow();
  });

  it("accepts an empty permissions array", () => {
    const result = customRoleFormSchema.parse({ name: "Éditeur", color: "orange", permissions: [] });
    expect(result.permissions).toEqual([]);
  });
});

describe("readCustomRoleForm", () => {
  it("reads multiple permissions checkboxes sharing the same field name", () => {
    const formData = formDataOf({ name: "Éditeur", color: "vert", permissions: ["users", "payments"] });
    expect(readCustomRoleForm(formData).permissions.sort()).toEqual(["payments", "users"]);
  });

  it("defaults description to an empty string when absent", () => {
    const formData = formDataOf({ name: "Éditeur", color: "vert", permissions: [] });
    expect(readCustomRoleForm(formData).description).toBe("");
  });
});
