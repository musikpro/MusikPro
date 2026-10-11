import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminButton from "@/components/admin/AdminButton";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

export type DisplayLimitField = {
  name: string;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
};

/**
 * Panneau commun des limites d'affichage côté client (longueur des titres, nombre de styles) : même formulaire
 * et même toast pour la landing, les styles musicaux et Tendances. Chaque page fournit sa Server Action.
 */
export default function DisplayLimitsPanel({
  title,
  description,
  action,
  fields,
}: {
  title: string;
  description: string;
  action: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  fields: DisplayLimitField[];
}) {
  return (
    <section className="admin-panel admin-bypass-panel">
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="list" size={20} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="admin-status is-success">{fields.map((field) => field.value).join(" / ")}</span>
      </div>
      <AdminActionForm action={action} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        {fields.map((field) => (
          <label key={field.name} className="admin-editor-field">
            <span>
              {field.label} ({field.unit}, entre {field.min} et {field.max})
            </span>
            <input
              type="number"
              name={field.name}
              inputMode="numeric"
              min={field.min}
              max={field.max}
              step={1}
              defaultValue={field.value}
              required
            />
          </label>
        ))}
        <div className="admin-btn-row">
          <AdminButton type="submit" variant="primary">
            <Icon i="save" size={15} />
            Enregistrer
          </AdminButton>
        </div>
      </AdminActionForm>
    </section>
  );
}
