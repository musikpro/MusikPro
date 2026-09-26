import { z } from "zod";
import { ALL_MODULES, type PermissionModule } from "@/lib/auth/permissions";
import { CUSTOM_ROLE_COLORS } from "@/lib/auth/custom-role-colors";

export const customRoleFormSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).default(""),
  color: z.enum(CUSTOM_ROLE_COLORS).default("orange"),
  permissions: z.array(z.enum(ALL_MODULES as [PermissionModule, ...PermissionModule[]])).max(ALL_MODULES.length),
});

/** Never `Object.fromEntries(formData)` — several "permissions" checkboxes share the same field name. */
export function readCustomRoleForm(formData: FormData) {
  return customRoleFormSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    color: formData.get("color"),
    permissions: formData.getAll("permissions"),
  });
}
