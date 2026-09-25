"use client";

import { useActionState } from "react";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { useAdminActionToast } from "@/components/admin/useAdminActionToast";
import type { RecipientRelationActionState } from "@/app/admin/recipient-relations/actions";

type RecipientRelationFormValues = {
  id?: string;
  name?: string;
  active?: boolean;
  sortOrder?: number;
};

export default function AdminRecipientRelationForm({
  action,
  values = {},
}: {
  action: (previous: RecipientRelationActionState, formData: FormData) => Promise<RecipientRelationActionState>;
  values?: RecipientRelationFormValues;
}) {
  const editing = Boolean(values.id);
  const [state, formAction, pending] = useActionState<RecipientRelationActionState, FormData>(action, null);
  useAdminActionToast(state);
  return (
    <section className="admin-panel admin-editor-card">
      <form action={formAction} className="admin-editor-grid admin-occasion-editor-grid">
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
        <label className="admin-editor-field">
          <span>Nom du lien</span>
          <input
            name="name"
            required
            minLength={2}
            maxLength={60}
            defaultValue={values.name}
            placeholder="Ex. Ma femme, Mon associé, Notre entreprise…"
          />
        </label>
        <label className="admin-editor-field">
          <span>Position d’affichage</span>
          <input name="sortOrder" required type="number" min="0" max="999" defaultValue={values.sortOrder ?? 100} />
        </label>
        <div className="admin-editor-field">
          <span>État</span>
          <AdminSelect
            name="active"
            defaultValue={String(values.active ?? true)}
            ariaLabel="État du lien"
            options={[
              { value: "true", label: "Actif — visible pour les clients" },
              { value: "false", label: "Désactivé — masqué pour les clients" },
            ]}
          />
        </div>
        <div className="admin-editor-actions is-wide">
          <AdminBackLink href="/admin/recipient-relations" label="Annuler" />
          <button type="submit" disabled={pending}>
            <Icon i={editing ? "save" : "plus"} size={17} />
            {editing ? "Enregistrer les modifications" : "Enregistrer le lien"}
          </button>
        </div>
      </form>
    </section>
  );
}
