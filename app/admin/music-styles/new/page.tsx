import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import AdminMusicStyleDescriptionFields from "@/components/admin/AdminMusicStyleDescriptionFields";
import AdminMusicStyleVisualPicker from "@/components/admin/AdminMusicStyleVisualPicker";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { createMusicStyle } from "../actions";

export default async function AdminNewMusicStylePage() {
  await requireAdmin();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/music-styles" />
      <AdminPageHeader
        eyebrow="Styles musicaux"
        title="Nouveau style musical"
        description="Ajoute un style qui pourra être proposé immédiatement dans le parcours de création client."
      />
      <section className="admin-panel admin-editor-card">
        <AdminActionForm action={createMusicStyle} className="admin-editor-grid">
          <label className="admin-editor-field">
            <span>Nom du style</span>
            <input name="name" required minLength={2} maxLength={60} placeholder="Ex. Coupé-décalé" />
          </label>
          <label className="admin-editor-field">
            <span>Position d’affichage</span>
            <input name="sortOrder" required type="number" min="0" max="999" defaultValue="100" />
          </label>
          <AdminMusicStyleDescriptionFields />
          <AdminMusicStyleVisualPicker />
          <div className="admin-editor-field is-wide">
            <span>État initial</span>
            <AdminSelect
              name="active"
              defaultValue="true"
              ariaLabel="État initial"
              options={[
                { value: "true", label: "Actif — visible pour les clients" },
                { value: "false", label: "Désactivé — masqué pour les clients" },
              ]}
            />
          </div>
          <div className="admin-editor-actions is-wide">
            <AdminBackLink href="/admin/music-styles" label="Annuler" />
            <button type="submit">
              <Icon i="plus" size={17} />
              Enregistrer le style
            </button>
          </div>
        </AdminActionForm>
      </section>
    </AdminPage>
  );
}
