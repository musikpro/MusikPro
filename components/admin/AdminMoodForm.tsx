"use client";

import { useRef, useState, useTransition } from "react";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminOccasionEmojiPicker from "@/components/admin/AdminOccasionEmojiPicker";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import Icon from "@/components/banani/Icon";
import { MOOD_AI_HINT_MAX_LENGTH, MOOD_EMOJI_OPTIONS } from "@/lib/moods/catalog";
import { suggestMoodAiHint } from "@/app/admin/moods/actions";

type MoodFormValues = {
  id?: string;
  name?: string;
  description?: string;
  emoji?: string;
  aiHint?: string;
  active?: boolean;
  sortOrder?: number;
};

export default function AdminMoodForm({
  action,
  values = {},
}: {
  action: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  values?: MoodFormValues;
}) {
  const editing = Boolean(values.id);
  const showToast = useAdminToast();
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const [aiHint, setAiHint] = useState(values.aiHint ?? "");
  const [suggesting, startSuggest] = useTransition();

  const suggest = () => {
    const name = nameRef.current?.value.trim() ?? "";
    if (name.length < 2) {
      showToast({ message: "Saisis d’abord le nom de l’ambiance.", tone: "error" });
      return;
    }
    startSuggest(async () => {
      const result = await suggestMoodAiHint({ name, description: descriptionRef.current?.value.trim() ?? "" });
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
      <AdminActionForm action={action} className="admin-editor-grid admin-occasion-editor-grid">
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
        <label className="admin-editor-field">
          <span>Nom de l’ambiance</span>
          <input
            ref={nameRef}
            name="name"
            required
            minLength={2}
            maxLength={40}
            defaultValue={values.name}
            placeholder="Ex. Nostalgique"
          />
        </label>
        <label className="admin-editor-field">
          <span>Position d’affichage</span>
          <input name="sortOrder" required type="number" min="0" max="999" defaultValue={values.sortOrder ?? 100} />
        </label>
        <label className="admin-editor-field">
          <span>Description (facultative)</span>
          <input
            ref={descriptionRef}
            name="description"
            maxLength={60}
            defaultValue={values.description}
            placeholder="Ex. Douce et pleine de souvenirs"
          />
        </label>
        <AdminOccasionEmojiPicker
          defaultEmoji={values.emoji ?? "🎶"}
          subject="de l’ambiance"
          options={MOOD_EMOJI_OPTIONS}
        />
        <label className="admin-editor-field is-wide">
          <span>Consigne pour l’IA musicale (anglais, facultative)</span>
          <textarea
            name="aiHint"
            rows={2}
            maxLength={MOOD_AI_HINT_MAX_LENGTH}
            value={aiHint}
            onChange={(event) => setAiHint(event.target.value)}
            placeholder="Ex. nostalgic, warm, bittersweet, soft piano and strings"
          />
          <small>
            Envoyée à Musicful avec le nom de l’ambiance ; jamais montrée au client. Vide : seul le nom est envoyé.{" "}
            {aiHint.length}/{MOOD_AI_HINT_MAX_LENGTH} caractères
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
            ariaLabel="État de l’ambiance"
            options={[
              { value: "true", label: "Active — visible pour les clients" },
              { value: "false", label: "Désactivée — masquée pour les clients" },
            ]}
          />
        </div>
        <div className="admin-editor-actions is-wide">
          <AdminBackLink href="/admin/moods" label="Annuler" />
          <button type="submit">
            <Icon i={editing ? "save" : "plus"} size={17} />
            {editing ? "Enregistrer les modifications" : "Enregistrer l’ambiance"}
          </button>
        </div>
      </AdminActionForm>
    </section>
  );
}
