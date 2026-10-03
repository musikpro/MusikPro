"use client";

import { useState, useTransition } from "react";
import { proposeOccasionBlocks } from "@/app/admin/occasion-fields/ai-actions";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
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
  const [recipient, setRecipient] = useState(String(showRecipient));
  const [sender, setSender] = useState(String(showSender));
  const [titleField, setTitleField] = useState(titleFieldId ?? "");
  const showToast = useAdminToast();
  const [suggesting, startSuggest] = useTransition();
  const suggest = () =>
    startSuggest(async () => {
      const result = await proposeOccasionBlocks(occasionId);
      if (!result.ok) {
        showToast({ message: result.message, tone: "error" });
        return;
      }
      setRecipient(String(result.showRecipient));
      setSender(String(result.showSender));
      setTitleField(result.titleFieldId ?? "");
      showToast({ message: "Blocs suggérés par l’IA : relis puis enregistre.", tone: "success" });
    });
  const yesNo = (label: string) => [
    { value: "true", label: `${label} — affiché` },
    { value: "false", label: `${label} — masqué` },
  ];
  return (
    <section className="admin-panel admin-editor-card">
      <AdminActionForm action={updateOccasionBlocks} className="admin-editor-grid admin-occasion-editor-grid admin-occasion-fields-form">
        <input type="hidden" name="occasionId" value={occasionId} />
        <div className="admin-editor-field">
          <span>Bloc « La personne concernée » (nom, prononciation, lien)</span>
          <AdminSelect
            name="showRecipient"
            ariaLabel="Afficher la personne concernée"
            value={recipient}
            onValueChange={setRecipient}
            options={yesNo("Personne concernée")}
          />
        </div>
        <div className="admin-editor-field">
          <span>Bloc « De la part de qui »</span>
          <AdminSelect
            name="showSender"
            ariaLabel="Afficher de la part de qui"
            value={sender}
            onValueChange={setSender}
            options={yesNo("De la part de qui")}
          />
        </div>
        <div className="admin-editor-field">
          <span>Champ utilisé pour le titre quand il n’y a pas de destinataire (ex. nom du produit)</span>
          <AdminSelect
            name="titleFieldId"
            ariaLabel="Champ du titre"
            value={titleField}
            onValueChange={setTitleField}
            options={[{ value: "", label: "Aucun — titre sans nom" }, ...fields.map((f) => ({ value: f.id, label: f.label }))]}
          />
        </div>
        <div className="admin-editor-actions is-wide admin-occasion-fields-actions">
          <button type="button" className="admin-secondary-action" onClick={suggest} disabled={suggesting}>
            <Icon i="bot" size={15} /> {suggesting ? "L’IA réfléchit…" : "Suggérer avec l’IA"}
          </button>
          <button type="submit">
            <Icon i="save" size={17} /> Enregistrer les blocs
          </button>
        </div>
      </AdminActionForm>
    </section>
  );
}
