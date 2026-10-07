"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import AdminSelect from "@/components/admin/AdminSelect";
import AdminOccasionEmojiPicker from "@/components/admin/AdminOccasionEmojiPicker";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { useAdminActionToast } from "@/components/admin/useAdminActionToast";
import {
  suggestOccasionAiHint,
  suggestOccasionDescription,
  type OccasionActionState,
} from "@/app/admin/occasions/actions";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { OCCASION_AI_HINT_MAX_LENGTH } from "@/lib/occasions/catalog";

type OccasionFormValues = {
  id?: string;
  name?: string;
  description?: string;
  emoji?: string;
  aiHint?: string;
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
  const showToast = useAdminToast();
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [aiHint, setAiHint] = useState(values.aiHint ?? "");
  const [suggesting, startSuggest] = useTransition();
  const [suggestingDescription, startSuggestDescription] = useTransition();
  const suggestDescription = () => {
    const name = nameRef.current?.value.trim() ?? "";
    if (name.length < 2) {
      showToast({ message: "Saisis d’abord le nom de l’occasion.", tone: "error" });
      return;
    }
    startSuggestDescription(async () => {
      const result = await suggestOccasionDescription({ name });
      if (result.ok) {
        if (descriptionRef.current) descriptionRef.current.value = result.description;
        showToast({ message: "Description suggérée : relis-la puis enregistre.", tone: "success" });
      } else {
        showToast({ message: result.message, tone: "error" });
      }
    });
  };
  const suggest = () => {
    const name = nameRef.current?.value.trim() ?? "";
    if (name.length < 2) {
      showToast({ message: "Saisis d’abord le nom de l’occasion.", tone: "error" });
      return;
    }
    startSuggest(async () => {
      const result = await suggestOccasionAiHint({ name, description: descriptionRef.current?.value.trim() ?? "" });
      if (result.ok) {
        setAiHint(result.hint);
        showToast({ message: "Consigne suggérée : relis-la puis enregistre.", tone: "success" });
      } else {
        showToast({ message: result.message, tone: "error" });
      }
    });
  };
  return (
    <section className="admin-panel admin-editor-card">
      <form action={formAction} className="admin-editor-grid admin-occasion-editor-grid">
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
        <label className="admin-editor-field">
          <span>Nom de l’occasion</span>
          <input
            ref={nameRef}
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
            ref={descriptionRef}
            name="description"
            maxLength={240}
            rows={4}
            defaultValue={values.description}
            placeholder="Décris quand cette occasion est proposée au client"
          />
          <button
            type="button"
            className="admin-secondary-action"
            onClick={suggestDescription}
            disabled={suggestingDescription}
          >
            <Icon i="bot" size={15} />
            {suggestingDescription ? "Suggestion…" : "Suggérer la description"}
          </button>
        </label>
        <AdminOccasionEmojiPicker defaultEmoji={values.emoji} />
        <label className="admin-editor-field">
          <span>Consigne pour l’IA musicale (anglais, facultative)</span>
          <textarea
            name="aiHint"
            rows={2}
            maxLength={OCCASION_AI_HINT_MAX_LENGTH}
            value={aiHint}
            onChange={(event) => setAiHint(event.target.value)}
            placeholder="Ex. birthday celebration, joyful, warm, heartfelt tribute"
          />
          <small>
            Seule cette consigne est envoyée à Musicful (jamais le nom français) ; elle n’est pas montrée au client.
            Vide : rien n’est envoyé pour l’occasion. {aiHint.length}/{OCCASION_AI_HINT_MAX_LENGTH}
          </small>
          <button type="button" className="admin-secondary-action" onClick={suggest} disabled={suggesting}>
            <Icon i="bot" size={15} />
            {suggesting ? "Suggestion…" : "Suggérer la consigne"}
          </button>
        </label>
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
