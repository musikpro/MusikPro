import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminButton from "@/components/admin/AdminButton";
import CountryIsTestButton from "./CountryIsTestButton";
import { setCountryDetectionSettings } from "./actions";

export type CountryDetectionPanelProps = {
  automaticDetectionEnabled: boolean;
  cacheTtlHours: number;
  fallbackCountryCode: string | null;
  upstashConfigured: boolean;
};

export default function CountryDetectionPanel({
  automaticDetectionEnabled,
  cacheTtlHours,
  fallbackCountryCode,
  upstashConfigured,
}: CountryDetectionPanelProps) {
  return (
    <section className={`admin-panel admin-bypass-panel ${automaticDetectionEnabled ? "is-active" : ""}`}>
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="map-pin" size={20} />
        </span>
        <div>
          <h2>Détection de pays (Country.is)</h2>
          <p>
            Détecte le pays du visiteur pour choisir automatiquement la langue de l’interface (l’association pays →
            langue reste gérée sur la page Langues). Sur Vercel, l’en-tête fourni par la plateforme est utilisé en
            priorité : aucun appel à country.is dans ce cas. Sinon, l’IP est résolue via country.is puis mise en cache
            pendant la durée choisie ci-dessous, pour éviter de réinterroger l’API tant qu’un visiteur est déjà connu.
          </p>
        </div>
        <span className={`admin-status ${automaticDetectionEnabled ? "is-success" : "is-pending"}`}>
          {automaticDetectionEnabled ? "Activée" : "Désactivée"}
        </span>
      </div>

      <p className="admin-bypass-warning" style={{ background: "transparent", border: "none", padding: 0 }}>
        <span className={`admin-status ${upstashConfigured ? "is-success" : "is-pending"}`}>
          {upstashConfigured ? "Cache Upstash configuré" : "Upstash non configuré — repli mémoire locale uniquement"}
        </span>
      </p>

      <AdminActionForm
        action={setCountryDetectionSettings}
        style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}
      >
        <label className="admin-check-control">
          <input type="checkbox" name="automaticDetectionEnabled" value="true" defaultChecked={automaticDetectionEnabled} />
          <span>Activer la détection automatique</span>
        </label>
        <label className="admin-editor-field">
          <span>Durée du cache (heures, 1 à 168)</span>
          <input type="number" name="cacheTtlHours" min={1} max={168} defaultValue={cacheTtlHours} />
        </label>
        <label className="admin-editor-field">
          <span>Pays de secours si l’API/l’IP échoue (optionnel)</span>
          <input
            type="text"
            name="fallbackCountryCode"
            maxLength={2}
            placeholder="CI"
            defaultValue={fallbackCountryCode ?? ""}
            style={{ textTransform: "uppercase", maxWidth: 90 }}
          />
        </label>
        <div className="admin-btn-row">
          <AdminButton type="submit" variant="primary">
            <Icon i="save" size={15} />
            Enregistrer
          </AdminButton>
        </div>
      </AdminActionForm>

      <div className="admin-btn-row" style={{ marginTop: 16 }}>
        <CountryIsTestButton />
      </div>
    </section>
  );
}
