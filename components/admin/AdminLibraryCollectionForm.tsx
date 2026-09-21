import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { parseCollectionStyles } from "@/lib/library-collections/catalog";

type Values = {
  id?: string;
  name?: string;
  description?: string;
  access?: string;
  active?: boolean;
  styles?: unknown;
  sortOrder?: number;
};
export default function AdminLibraryCollectionForm({
  action,
  styleNames,
  values = {},
}: {
  action: (formData: FormData) => Promise<void>;
  styleNames: string[];
  values?: Values;
}) {
  const selected = new Set(parseCollectionStyles(values.styles));
  const editing = Boolean(values.id);
  return (
    <section className="admin-panel admin-editor-card">
      <form action={action} className="admin-editor-grid admin-library-editor-grid">
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
        <label className="admin-editor-field">
          <span>Nom de la collection</span>
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={values.name}
            placeholder="Ex. Afrobeat Essentials"
          />
        </label>
        <label className="admin-editor-field">
          <span>Position d’affichage</span>
          <input name="sortOrder" required type="number" min="0" max="999" defaultValue={values.sortOrder ?? 100} />
        </label>
        <label className="admin-editor-field is-wide">
          <span>Description</span>
          <textarea
            name="description"
            required
            minLength={5}
            maxLength={280}
            rows={4}
            defaultValue={values.description}
            placeholder="Décris la collection et l’ambiance proposée"
          />
        </label>
        <div className="admin-editor-field">
          <span>Accès</span>
          <AdminSelect
            name="access"
            defaultValue={values.access ?? "public"}
            ariaLabel="Accès à la collection"
            options={[
              { value: "public", label: "Public — visible par tous les clients" },
              { value: "private", label: "Privé — réservé à l’administration" },
            ]}
          />
        </div>
        <div className="admin-editor-field">
          <span>Publication</span>
          <AdminSelect
            name="active"
            defaultValue={String(values.active ?? true)}
            ariaLabel="État de publication"
            options={[
              { value: "true", label: "Publiée — visible dans Découvrir" },
              { value: "false", label: "Brouillon — masquée aux clients" },
            ]}
          />
        </div>
        <fieldset className="admin-collection-style-field is-wide">
          <legend>Styles inclus</legend>
          <p>Sélectionne les styles affichés dans cette collection. Sans sélection, tous les styles seront inclus.</p>
          <div>
            {styleNames.map((style) => (
              <label key={style}>
                <input type="checkbox" name="styles" value={style} defaultChecked={selected.has(style)} />
                <span>{style}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="admin-collection-preview is-wide">
          <span>
            <Icon i="library" size={22} />
          </span>
          <div>
            <small>Aperçu client</small>
            <strong>{values.name || "Nom de la collection"}</strong>
            <p>{values.description || "La description aidera les clients à comprendre cette sélection."}</p>
          </div>
        </div>
        <div className="admin-editor-actions is-wide">
          <AdminBackLink href="/admin/library" label="Annuler" />
          <button type="submit">
            <Icon i={editing ? "save" : "plus"} size={17} />
            {editing ? "Enregistrer les modifications" : "Créer la collection"}
          </button>
        </div>
      </form>
    </section>
  );
}
