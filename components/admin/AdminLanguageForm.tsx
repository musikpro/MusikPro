"use client";

import { useActionState } from "react";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { useAdminActionToast } from "@/components/admin/useAdminActionToast";
import type { LanguageActionState } from "@/app/admin/languages/actions";

type Values = {
  id?: string;
  name?: string;
  nativeName?: string;
  code?: string;
  flag?: string;
  interfaceEnabled?: boolean;
  lyricsEnabled?: boolean;
  interfaceOrder?: number;
  lyricsOrder?: number;
};
export default function AdminLanguageForm({
  action,
  values = {},
}: {
  action: (previous: LanguageActionState, data: FormData) => Promise<LanguageActionState>;
  values?: Values;
}) {
  const editing = Boolean(values.id);
  const [state, formAction, pending] = useActionState<LanguageActionState, FormData>(action, null);
  useAdminActionToast(state);
  return (
    <section className="admin-panel admin-editor-card">
      <form action={formAction} className="admin-editor-grid">
        {values.id && <input type="hidden" name="id" value={values.id} />}
        <label className="admin-editor-field">
          <span>Nom en français</span>
          <input
            name="name"
            required
            minLength={2}
            maxLength={60}
            defaultValue={values.name}
            placeholder="Ex. Italien"
          />
        </label>
        <label className="admin-editor-field">
          <span>Nom natif</span>
          <input
            name="nativeName"
            required
            minLength={2}
            maxLength={60}
            defaultValue={values.nativeName}
            placeholder="Ex. Italiano"
          />
        </label>
        <label className="admin-editor-field">
          <span>Code ISO</span>
          <input
            name="code"
            required
            pattern="[a-zA-Z]{2,3}(-[a-zA-Z]{2})?"
            defaultValue={values.code}
            placeholder="Ex. it"
          />
        </label>
        <label className="admin-editor-field">
          <span>Drapeau</span>
          <input name="flag" required maxLength={12} defaultValue={values.flag ?? "🌍"} />
        </label>
        <div className="admin-editor-field">
          <span>Interface du site</span>
          <AdminSelect
            name="interfaceEnabled"
            ariaLabel="Disponibilité dans l’interface"
            defaultValue={String(values.interfaceEnabled ?? false)}
            options={[
              { value: "true", label: "Active — proposée aux utilisateurs" },
              { value: "false", label: "Inactive" },
            ]}
          />
        </div>
        <label className="admin-editor-field">
          <span>Ordre interface</span>
          <input
            name="interfaceOrder"
            type="number"
            min="0"
            max="999"
            required
            defaultValue={values.interfaceOrder ?? 100}
          />
        </label>
        <div className="admin-editor-field">
          <span>Paroles de chanson</span>
          <AdminSelect
            name="lyricsEnabled"
            ariaLabel="Disponibilité pour les paroles"
            defaultValue={String(values.lyricsEnabled ?? true)}
            options={[
              { value: "true", label: "Active — disponible pour les paroles" },
              { value: "false", label: "Inactive" },
            ]}
          />
        </div>
        <label className="admin-editor-field">
          <span>Ordre paroles</span>
          <input name="lyricsOrder" type="number" min="0" max="999" required defaultValue={values.lyricsOrder ?? 100} />
        </label>
        <div className="admin-editor-actions is-wide">
          <AdminBackLink href="/admin/languages" label="Annuler" />
          <button type="submit" disabled={pending}>
            <Icon i={editing ? "save" : "plus"} size={17} />
            {editing ? "Enregistrer les modifications" : "Ajouter la langue"}
          </button>
        </div>
      </form>
    </section>
  );
}
