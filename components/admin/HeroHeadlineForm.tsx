"use client";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import { setHeroHeadline } from "@/app/admin/animated-texts/actions";

export default function HeroHeadlineForm({ headline }: { headline: string }) {
  return (
    <section className="admin-panel">
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="type" size={20} />
        </span>
        <div>
          <h2>Titre principal du Hero</h2>
          <p>Le grand titre affiché en haut de la landing publique, modifiable à tout moment.</p>
        </div>
      </div>
      <AdminActionForm action={setHeroHeadline} className="admin-editor-grid">
        <label className="admin-editor-field admin-editor-field-wide">
          <span>Titre</span>
          <input name="headline" required minLength={2} maxLength={120} defaultValue={headline} />
        </label>
        <div className="admin-editor-actions is-wide">
          <button type="submit">
            <Icon i="save" size={17} /> Enregistrer
          </button>
        </div>
      </AdminActionForm>
    </section>
  );
}
