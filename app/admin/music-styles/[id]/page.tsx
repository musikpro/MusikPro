import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminMusicStyleVisualPicker from "@/components/admin/AdminMusicStyleVisualPicker";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { musicStyles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { updateMusicStyle } from "../actions";

export default async function AdminEditMusicStylePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [style] = await getServiceDb().select().from(musicStyles).where(eq(musicStyles.id, id)).limit(1);
  if (!style) notFound();

  return (
    <AdminPage>
      <AdminBackLink href="/admin/music-styles" />
      <AdminPageHeader
        eyebrow="Styles musicaux"
        title={`Modifier ${style.name}`}
        description="Mets à jour les informations visibles dans le parcours client."
      />
      <section className="admin-panel admin-editor-card">
        <form action={updateMusicStyle} className="admin-editor-grid">
          <input type="hidden" name="id" value={style.id} />
          <label className="admin-editor-field">
            <span>Nom du style</span>
            <input name="name" required minLength={2} maxLength={60} defaultValue={style.name} />
          </label>
          <label className="admin-editor-field">
            <span>Position d’affichage</span>
            <input name="sortOrder" required type="number" min="0" max="999" defaultValue={style.sortOrder} />
          </label>
          <label className="admin-editor-field is-wide">
            <span>Description</span>
            <textarea name="description" required minLength={5} maxLength={240} rows={4} defaultValue={style.description} />
          </label>
          <AdminMusicStyleVisualPicker defaultIcon={style.icon} defaultTone={style.tone} />
          <div className="admin-editor-field is-wide">
            <span>État</span>
            <AdminSelect
              name="active"
              defaultValue={String(style.active)}
              ariaLabel="État du style"
              options={[
                { value: "true", label: "Actif — visible pour les clients" },
                { value: "false", label: "Désactivé — masqué pour les clients" },
              ]}
            />
          </div>
          <div className="admin-editor-actions is-wide">
            <AdminBackLink href="/admin/music-styles" label="Annuler" />
            <button type="submit">
              <Icon i="save" size={17} />
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </section>
    </AdminPage>
  );
}
