"use client";

import { useState, useTransition } from "react";
import AdminActionForm from "@/components/admin/AdminActionForm";
import { completeOccasionField } from "@/app/admin/occasion-fields/ai-actions";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminOccasionEmojiPicker from "@/components/admin/AdminOccasionEmojiPicker";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { FIELD_ICON_OPTIONS, formatOptionsText } from "@/lib/occasion-fields/form-schema";
import type { OccasionFieldDefinition } from "@/lib/occasion-fields/types";

const TYPE_OPTIONS = [
  { value: "short_text", label: "Texte court" },
  { value: "long_text", label: "Texte long" },
  { value: "select", label: "Liste de choix" },
  { value: "number", label: "Nombre" },
  { value: "date", label: "Date" },
];

export default function AdminOccasionFieldForm({
  action,
  occasionId,
  field,
}: {
  action: (previous: AdminActionState, data: FormData) => Promise<AdminActionState>;
  occasionId: string;
  field?: OccasionFieldDefinition & { active: boolean };
}) {
  const [type, setType] = useState<string>(field?.type ?? "short_text");
  const [draft, setDraft] = useState({
    label: field?.label ?? "",
    helpText: field?.helpText ?? "",
    placeholder: field?.placeholder ?? "",
    icon: field?.icon || "📝",
    optionsText: field ? formatOptionsText(field.options) : "",
    display: field?.config.display ?? "tiles",
    required: String(field?.required ?? false),
    aiHint: field?.aiHint ?? "",
    min: field?.config.min !== undefined ? String(field.config.min) : "",
    max: field?.config.max !== undefined ? String(field.config.max) : "",
    maxLength: field?.config.maxLength !== undefined ? String(field.config.maxLength) : "",
  });
  const showToast = useAdminToast();
  const [completing, startComplete] = useTransition();
  const patch = (values: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...values }));

  const complete = () =>
    startComplete(async () => {
      const result = await completeOccasionField({ occasionId, label: draft.label });
      if (!result.ok) {
        showToast({ message: result.message, tone: "error" });
        return;
      }
      const p = result.proposal;
      setType(p.type);
      patch({
        label: p.label,
        helpText: p.helpText,
        placeholder: p.placeholder,
        icon: p.icon || "📝",
        optionsText: formatOptionsText(p.options),
        display: p.config.display ?? "tiles",
        required: String(p.required),
        aiHint: p.aiHint,
        min: p.config.min !== undefined ? String(p.config.min) : "",
        max: p.config.max !== undefined ? String(p.config.max) : "",
        maxLength: p.config.maxLength !== undefined ? String(p.config.maxLength) : "",
      });
      showToast({ message: "Champ prérempli par l’IA : relis puis enregistre.", tone: "success" });
    });

  const text = type === "short_text" || type === "long_text";
  return (
    <section className="admin-panel admin-editor-card">
      <AdminActionForm action={action} className="admin-editor-grid admin-occasion-editor-grid">
        <input type="hidden" name="occasionId" value={occasionId} />
        {field ? <input type="hidden" name="id" value={field.id} /> : null}
        <label className="admin-editor-field">
          <span>Libellé affiché au client</span>
          <input name="label" required minLength={2} maxLength={80} value={draft.label} onChange={(event) => patch({ label: event.target.value })} placeholder="Ex. Jour de naissance" />
          <button type="button" className="admin-secondary-action" onClick={complete} disabled={completing || draft.label.trim().length < 2}>
            <Icon i="sparkles" size={15} /> {completing ? "L’IA complète…" : "Compléter avec l’IA"}
          </button>
        </label>
        <div className="admin-editor-field">
          <span>Type de champ</span>
          <AdminSelect name="type" ariaLabel="Type de champ" value={type} onValueChange={setType} options={TYPE_OPTIONS} />
        </div>
        <label className="admin-editor-field">
          <span>Texte d’exemple dans le champ</span>
          <input name="placeholder" maxLength={60} value={draft.placeholder} onChange={(event) => patch({ placeholder: event.target.value })} placeholder="Ex: 15" />
        </label>
        <div className="admin-editor-field">
          <span>Icône devant le libellé</span>
          <AdminOccasionEmojiPicker key={draft.icon} name="icon" defaultEmoji={draft.icon} subject="du champ" options={FIELD_ICON_OPTIONS} />
        </div>
        <label className="admin-editor-field is-wide">
          <span>Aide sous le libellé (facultatif)</span>
          <input name="helpText" maxLength={160} value={draft.helpText} onChange={(event) => patch({ helpText: event.target.value })} />
        </label>
        {type === "select" ? (
          <>
            <label className="admin-editor-field is-wide">
              <span>Choix — un par ligne, avec un emoji devant (ex. « ❄️ Janvier »), de 2 à 12</span>
              <textarea name="optionsText" rows={6} maxLength={1500} value={draft.optionsText} onChange={(event) => patch({ optionsText: event.target.value })} />
            </label>
            <div className="admin-editor-field">
              <span>Affichage</span>
              <AdminSelect
                name="display"
                ariaLabel="Affichage de la liste"
                value={draft.display}
                onValueChange={(value) => patch({ display: value as "dropdown" | "tiles" })}
                options={[
                  { value: "tiles", label: "Tuiles avec emoji" },
                  { value: "dropdown", label: "Liste déroulante" },
                ]}
              />
            </div>
          </>
        ) : null}
        {text ? (
          <label className="admin-editor-field">
            <span>Longueur maximale ({type === "short_text" ? "≤ 200" : "≤ 600"})</span>
            <input name="maxLength" type="number" min={1} max={type === "short_text" ? 200 : 600} value={draft.maxLength} onChange={(event) => patch({ maxLength: event.target.value })} />
          </label>
        ) : null}
        {type === "number" ? (
          <>
            <label className="admin-editor-field">
              <span>Minimum</span>
              <input name="min" type="number" value={draft.min} onChange={(event) => patch({ min: event.target.value })} />
            </label>
            <label className="admin-editor-field">
              <span>Maximum</span>
              <input name="max" type="number" value={draft.max} onChange={(event) => patch({ max: event.target.value })} />
            </label>
          </>
        ) : null}
        <div className="admin-editor-field">
          <span>Obligatoire</span>
          <AdminSelect
            name="required"
            ariaLabel="Champ obligatoire"
            value={draft.required}
            onValueChange={(value) => patch({ required: value })}
            options={[
              { value: "false", label: "Facultatif" },
              { value: "true", label: "Obligatoire" },
            ]}
          />
        </div>
        <label className="admin-editor-field is-wide">
          <span>Consigne pour l’IA (en anglais, invisible du client, 200 caractères max)</span>
          <input name="aiHint" maxLength={200} value={draft.aiHint} onChange={(event) => patch({ aiHint: event.target.value })} placeholder="Ex. Mention the birth month warmly." />
        </label>
        <label className="admin-editor-field">
          <span>Position d’affichage</span>
          <input name="sortOrder" required type="number" min={0} max={999} defaultValue={field?.sortOrder ?? 100} />
        </label>
        <div className="admin-editor-field">
          <span>État</span>
          <AdminSelect
            name="active"
            ariaLabel="État du champ"
            defaultValue={String(field?.active ?? true)}
            options={[
              { value: "true", label: "Actif — visible pour les clients" },
              { value: "false", label: "Désactivé — masqué" },
            ]}
          />
        </div>
        <div className="admin-editor-actions is-wide">
          <AdminBackLink href={`/admin/occasion-fields/${occasionId}`} label="Annuler" />
          <button type="submit">
            <Icon i={field ? "save" : "plus"} size={17} />
            {field ? "Enregistrer les modifications" : "Créer le champ"}
          </button>
        </div>
      </AdminActionForm>
    </section>
  );
}
