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
            un champ vide : le bouton mène alors à la page d&rsquo;installation du site (/download), qui propose
            l&rsquo;installation sur l&rsquo;écran d&rsquo;accueil du téléphone.
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
        <input type="hidden" name="hideInApp" value="on" />
        <p className="admin-field-hint">
          Ces boutons sont toujours masqués dans l&rsquo;application mobile (Play Store et App Store refusent
          qu&rsquo;une application en promeuve une autre). Sur le web, sur mobile comme sur ordinateur, ils restent
          toujours visibles.
        </p>
        <button type="submit" className="admin-form-submit">
          <Icon i="save" size={16} />
          Enregistrer
        </button>
      </AdminActionForm>
    </section>
  );
}
