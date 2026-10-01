"use client";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import { setStoreLinks } from "@/app/admin/mobile-apps/actions";
import type { StoreLinksStatus } from "@/lib/settings/store-links";

export default function StoreLinksPanel({ status }: { status: StoreLinksStatus }) {
  const configured = Boolean(status.googlePlayUrl || status.appStoreUrl);
  return (
    <section className={`admin-panel ${configured ? "is-active" : ""}`}>
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="smartphone" size={20} />
        </span>
        <div>
          <h2>Boîte « Télécharger l&rsquo;application »</h2>
          <p>
            Liens ouverts quand un client clique sur Google Play ou l&rsquo;App Store depuis son tableau de bord. Laisse
            un champ vide pour afficher « Bientôt disponible » à la place.
          </p>
        </div>
        <span className={`admin-status ${configured ? "is-success" : "is-pending"}`}>
          {configured ? "Configuré" : "À configurer"}
        </span>
      </div>
      <AdminActionForm
        key={`${status.googlePlayUrl ?? ""}-${status.appStoreUrl ?? ""}-${status.hideInApp}`}
        action={setStoreLinks}
        className="admin-stack-form admin-store-links-form"
      >
        <label className="admin-editor-field">
          <span>Lien Google Play</span>
          <input
            type="url"
            name="googlePlayUrl"
            placeholder="https://play.google.com/store/apps/details?id=..."
            defaultValue={status.googlePlayUrl ?? ""}
          />
        </label>
        <label className="admin-editor-field">
          <span>Lien App Store</span>
          <input
            type="url"
            name="appStoreUrl"
            placeholder="https://apps.apple.com/app/id..."
            defaultValue={status.appStoreUrl ?? ""}
          />
        </label>
        <label className="admin-check-control">
          <input type="checkbox" name="hideInApp" defaultChecked={status.hideInApp} />
          <span>Masquer ces boutons dans l&rsquo;application mobile</span>
        </label>
        <p className="admin-field-hint">
          Pour les personnes qui ont déjà l&rsquo;application ou qui affichent le site dedans (tableau de bord et menu
          latéral). Sur le web, sur mobile comme sur ordinateur, les boutons restent toujours visibles.
        </p>
        <button type="submit" className="admin-form-submit">
          <Icon i="save" size={16} />
          Enregistrer
        </button>
      </AdminActionForm>
    </section>
  );
}
