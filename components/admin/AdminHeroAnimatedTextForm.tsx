"use client";

import { useActionState } from "react";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { useAdminActionToast } from "@/components/admin/useAdminActionToast";
import type { HeroAnimatedTextActionState } from "@/app/admin/animated-texts/actions";

type HeroAnimatedTextFormValues = {
  id?: string;
  label?: string;
  emoji?: string;
  active?: boolean;
  sortOrder?: number;
};

export default function AdminHeroAnimatedTextForm({
  action,
  values = {},
}: {
  action: (previous: HeroAnimatedTextActionState, formData: FormData) => Promise<HeroAnimatedTextActionState>;
  values?: HeroAnimatedTextFormValues;
}) {
  const editing = Boolean(values.id);
  const [state, formAction, pending] = useActionState<HeroAnimatedTextActionState, FormData>(action, null);
  useAdminActionToast(state);
  return (
    <section className="admin-panel admin-editor-card">
      <form action={formAction} className="admin-editor-grid admin-occasion-editor-grid">
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
        <label className="admin-editor-field">
          <span>Texte</span>
          <input
            name="label"
            required
            minLength={1}
            maxLength={80}
            defaultValue={values.label}
            placeholder="Ex. Anniversaire"
          />
        </label>
        <label className="admin-editor-field">
          <span>Emoji</span>
          <input name="emoji" required minLength={1} maxLength={8} defaultValue={values.emoji ?? "🎵"} placeholder="🎵" />
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
            ariaLabel="État du texte animé"
            options={[
              { value: "true", label: "Actif — visible sur la landing" },
              { value: "false", label: "Désactivé — masqué sur la landing" },
            ]}
          />
        </div>
        <div className="admin-editor-actions is-wide">
          <AdminBackLink href="/admin/animated-texts?tab=texts" label="Annuler" />
          <button type="submit" disabled={pending}>
            <Icon i={editing ? "save" : "plus"} size={17} />
            {editing ? "Enregistrer les modifications" : "Enregistrer le texte"}
          </button>
        </div>
      </form>
    </section>
  );
}
