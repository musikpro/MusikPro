"use client";

import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import Icon from "@/components/banani/Icon";
import { updateOccasionBlocks } from "@/app/admin/occasion-fields/actions";

export default function AdminOccasionBlocksForm({
  occasionId,
  showRecipient,
  showSender,
  titleFieldId,
  fields,
}: {
  occasionId: string;
  showRecipient: boolean;
  showSender: boolean;
  titleFieldId: string | null;
  fields: Array<{ id: string; label: string }>;
}) {
  const yesNo = (label: string) => [
    { value: "true", label: `${label} — affiché` },
    { value: "false", label: `${label} — masqué` },
  ];
  return (
    <section className="admin-panel admin-editor-card">
      <AdminActionForm action={updateOccasionBlocks} className="admin-editor-grid admin-occasion-editor-grid">
        <input type="hidden" name="occasionId" value={occasionId} />
        <div className="admin-editor-field">
          <span>Bloc « La personne concernée » (nom, prononciation, lien)</span>
          <AdminSelect
            name="showRecipient"
            ariaLabel="Afficher la personne concernée"
            defaultValue={String(showRecipient)}
            options={yesNo("Personne concernée")}
          />
        </div>
        <div className="admin-editor-field">
          <span>Bloc « De la part de qui »</span>
          <AdminSelect
            name="showSender"
            ariaLabel="Afficher de la part de qui"
            defaultValue={String(showSender)}
            options={yesNo("De la part de qui")}
          />
        </div>
        <div className="admin-editor-field is-wide">
          <span>Champ utilisé pour le titre quand il n’y a pas de destinataire (ex. nom du produit)</span>
          <AdminSelect
            name="titleFieldId"
            ariaLabel="Champ du titre"
            defaultValue={titleFieldId ?? ""}
            options={[{ value: "", label: "Aucun — titre sans nom" }, ...fields.map((f) => ({ value: f.id, label: f.label }))]}
          />
        </div>
        <div className="admin-editor-actions is-wide">
          <button type="submit">
            <Icon i="save" size={17} /> Enregistrer les blocs
          </button>
        </div>
      </AdminActionForm>
    </section>
  );
}
