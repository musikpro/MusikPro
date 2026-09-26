"use client";

import AdminActionForm from "@/components/admin/AdminActionForm";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { ALL_MODULES, MODULE_META } from "@/lib/auth/permissions";
import { CUSTOM_ROLE_COLORS, CUSTOM_ROLE_COLOR_HEX, type CustomRoleColor } from "@/lib/auth/custom-role-colors";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

export type CustomRoleFormValue = {
  id: string;
  name: string;
  description: string;
  color: CustomRoleColor;
  permissions: string[];
};

export default function AdminCustomRoleForm({
  action,
  role,
}: {
  action: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  role?: CustomRoleFormValue;
}) {
  return (
    <AdminActionForm action={action} className="admin-editor-grid">
      {role ? <input type="hidden" name="id" value={role.id} /> : null}
      <label className="admin-editor-field is-wide">
        <span>Nom du rôle</span>
        <input name="name" required minLength={2} maxLength={60} defaultValue={role?.name} placeholder="Ex. Éditeur" />
      </label>
      <label className="admin-editor-field is-wide">
        <span>Description</span>
        <textarea
          name="description"
          maxLength={300}
          rows={3}
          defaultValue={role?.description}
          placeholder="À quoi sert ce rôle ?"
        />
      </label>
      <div className="admin-editor-field is-wide">
        <span>Couleur</span>
        <div className="admin-color-options">
          {CUSTOM_ROLE_COLORS.map((color) => (
            <label className="admin-color-option" key={color}>
              <input type="radio" name="color" value={color} defaultChecked={(role?.color ?? "orange") === color} />
              <span className="admin-color-swatch" style={{ background: CUSTOM_ROLE_COLOR_HEX[color] }} />
              {color}
            </label>
          ))}
        </div>
      </div>
      <div className="admin-editor-field is-wide">
        <span>Permissions</span>
        {ALL_MODULES.map((module) => (
          <label className="admin-editor-check" key={module}>
            <input type="checkbox" name="permissions" value={module} defaultChecked={role?.permissions.includes(module)} />
            <span>{MODULE_META[module].label}</span>
          </label>
        ))}
      </div>
      <div className="admin-editor-actions is-wide">
        <AdminBackLink href="/admin/roles" label="Annuler" />
        <button type="submit">
          <Icon i={role ? "save" : "plus"} size={17} />
          {role ? "Enregistrer les modifications" : "Créer le rôle"}
        </button>
      </div>
    </AdminActionForm>
  );
}
