"use client";

import { useActionState } from "react";
import AdminSelect from "@/components/admin/AdminSelect";
import AdminOccasionEmojiPicker from "@/components/admin/AdminOccasionEmojiPicker";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { useAdminActionToast } from "@/components/admin/useAdminActionToast";
import type { OccasionActionState } from "@/app/admin/occasions/actions";

type OccasionFormValues = {
  id?: string;
  name?: string;
  description?: string;
  emoji?: string;
  active?: boolean;
  sortOrder?: number;
};

export default function AdminOccasionForm({
  action,
  values = {},
}: {
  action: (previous: OccasionActionState, formData: FormData) => Promise<OccasionActionState>;
  values?: OccasionFormValues;
}) {
  const editing = Boolean(values.id);
  const [state, formAction, pending] = useActionState<OccasionActionState, FormData>(action, null);
  useAdminActionToast(state);
  return (
    <section className="admin-panel admin-editor-card">
      <form action={formAction} className="admin-editor-grid admin-occasion-editor-grid">
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
        <label className="admin-editor-field">
          <span>Nom de l’occasion</span>
          <input
            name="name"
            required
            minLength={2}
            maxLength={60}
            defaultValue={values.name}
            placeholder="Ex. Mariage"
          />
        </label>
        <label className="admin-editor-field">
          <span>Position d’affichage</span>
          <input name="sortOrder" required type="number" min="0" max="999" defaultValue={values.sortOrder ?? 100} />
        </label>
        <label className="admin-editor-field">
          <span>Description</span>
          <textarea
            name="description"
            maxLength={240}
            rows={4}
            defaultValue={values.description}
            placeholder="Décris quand cette occasion est proposée au client"
          />
        </label>
        <AdminOccasionEmojiPicker defaultEmoji={values.emoji} />
        <div className="admin-editor-field">
          <span>État</span>
          <AdminSelect
            name="active"
            defaultValue={String(values.active ?? true)}
            ariaLabel="État de l’occasion"
            options={[
              { value: "true", label: "Active — visible pour les clients" },
              { value: "false", label: "Désactivée — masquée pour les clients" },
            ]}
          />
        </div>
        <div className="admin-editor-actions is-wide">
          <AdminBackLink href="/admin/occasions" label="Annuler" />
          <button type="submit" disabled={pending}>
            <Icon i={editing ? "save" : "plus"} size={17} />
            {editing ? "Enregistrer les modifications" : "Enregistrer l’occasion"}
          </button>
        </div>
      </form>
    </section>
  );
}
