import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";

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
  action: (formData: FormData) => Promise<void>;
  values?: RecipientRelationFormValues;
}) {
  const editing = Boolean(values.id);
  return (
    <section className="admin-panel admin-editor-card">
      <form action={action} className="admin-editor-grid admin-occasion-editor-grid">
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
          <button type="submit">
            <Icon i={editing ? "save" : "plus"} size={17} />
            {editing ? "Enregistrer les modifications" : "Enregistrer le lien"}
          </button>
        </div>
      </form>
    </section>
  );
}
