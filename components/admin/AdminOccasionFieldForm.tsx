"use client";

import { useState } from "react";
import AdminActionForm from "@/components/admin/AdminActionForm";
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
  const text = type === "short_text" || type === "long_text";
  return (
    <section className="admin-panel admin-editor-card">
      <AdminActionForm action={action} className="admin-editor-grid admin-occasion-editor-grid">
        <input type="hidden" name="occasionId" value={occasionId} />
        {field ? <input type="hidden" name="id" value={field.id} /> : null}
        <label className="admin-editor-field">
          <span>Libellé affiché au client</span>
          <input name="label" required minLength={2} maxLength={80} defaultValue={field?.label} placeholder="Ex. Jour de naissance" />
        </label>
        <div className="admin-editor-field">
          <span>Type de champ</span>
          <AdminSelect name="type" ariaLabel="Type de champ" value={type} onValueChange={setType} options={TYPE_OPTIONS} />
        </div>
        <label className="admin-editor-field">
          <span>Texte d’exemple dans le champ</span>
          <input name="placeholder" maxLength={60} defaultValue={field?.placeholder} placeholder="Ex: 15" />
        </label>
        <div className="admin-editor-field">
          <span>Icône devant le libellé</span>
          <AdminOccasionEmojiPicker name="icon" defaultEmoji={field?.icon || "📝"} subject="du champ" options={FIELD_ICON_OPTIONS} />
        </div>
        <label className="admin-editor-field is-wide">
          <span>Aide sous le libellé (facultatif)</span>
          <input name="helpText" maxLength={160} defaultValue={field?.helpText} />
        </label>
        {type === "select" ? (
          <>
            <label className="admin-editor-field is-wide">
              <span>Choix — un par ligne, avec un emoji devant (ex. « ❄️ Janvier »), de 2 à 12</span>
              <textarea name="optionsText" rows={6} maxLength={1500} defaultValue={field ? formatOptionsText(field.options) : ""} />
            </label>
            <div className="admin-editor-field">
              <span>Affichage</span>
              <AdminSelect
                name="display"
                ariaLabel="Affichage de la liste"
                defaultValue={field?.config.display ?? "tiles"}
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
            <input name="maxLength" type="number" min={1} max={type === "short_text" ? 200 : 600} defaultValue={field?.config.maxLength} />
          </label>
        ) : null}
        {type === "number" ? (
          <>
            <label className="admin-editor-field">
              <span>Minimum</span>
              <input name="min" type="number" defaultValue={field?.config.min} />
            </label>
            <label className="admin-editor-field">
              <span>Maximum</span>
              <input name="max" type="number" defaultValue={field?.config.max} />
            </label>
          </>
        ) : null}
        <div className="admin-editor-field">
          <span>Obligatoire</span>
          <AdminSelect
            name="required"
            ariaLabel="Champ obligatoire"
            defaultValue={String(field?.required ?? false)}
            options={[
              { value: "false", label: "Facultatif" },
              { value: "true", label: "Obligatoire" },
            ]}
          />
        </div>
        <label className="admin-editor-field is-wide">
          <span>Consigne pour l’IA (en anglais, invisible du client, 200 caractères max)</span>
          <input name="aiHint" maxLength={200} defaultValue={field?.aiHint} placeholder="Ex. Mention the birth month warmly." />
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
