import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import Icon from "@/components/banani/Icon";
import { BASE_CURRENCY_CODE, formatCreditPrice, PIVOT_CURRENCY_CODE, type CreditCurrency } from "@/lib/credit-plans/currency";
import { FX_PROVIDER_OPTIONS } from "@/lib/credit-plans/fx-rates";
import {
  createCurrency,
  deleteCurrency,
  saveCurrency,
  saveRateProvider,
  syncCurrencyRates,
  toggleCurrency,
} from "./currency-actions";

type Props = {
  catalog: CreditCurrency[];
  settings: { rateProvider: string; lastSyncedAt: Date | null; lastSyncMessage: string | null } | null;
  countryCountByCurrency: Record<string, number>;
};

const SAMPLE_XOF = 1_000;

function formatRate(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 6 }).format(value);
}

export default function CurrencySection({ catalog, settings, countryCountByCurrency }: Props) {
  const base = catalog.find((item) => item.code === BASE_CURRENCY_CODE);
  const enabledCount = catalog.filter((item) => item.enabled).length;
  const lastSync = settings?.lastSyncedAt
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(settings.lastSyncedAt)
    : null;
  return (
    <>
      <section className="admin-panel admin-language-section">
        <div className="admin-section-heading">
          <div>
            <h2>Conversion des monnaies</h2>
            <p>
              Tous les prix sont saisis en franc CFA (XOF), la monnaie par défaut. Le prix est d’abord converti en
              dollar, puis chaque autre monnaie est calculée à partir du dollar : prix en monnaie = prix XOF ÷ taux XOF
              × taux de la monnaie (taux = unités pour 1 $).
            </p>
          </div>
          <span className="admin-status is-success">
            1 $ = {base ? formatRate(base.unitsPerUsd) : "—"} FCFA
          </span>
        </div>
        <AdminActionForm action={saveRateProvider} className="admin-fx-toolbar">
          <div className="admin-editor-field">
            <span>Service de conversion international</span>
            <AdminSelect
              name="rateProvider"
              ariaLabel="Service de conversion"
              defaultValue={settings?.rateProvider ?? "auto"}
              options={[
                { value: "auto", label: "Automatique (bascule si un service est indisponible)" },
                ...FX_PROVIDER_OPTIONS.map((provider) => ({ value: provider.id, label: provider.label })),
              ]}
            />
          </div>
          <button type="submit" className="admin-secondary-action">
            <Icon i="save" size={15} /> Enregistrer
          </button>
        </AdminActionForm>
        <ul className="admin-fx-providers">
          {FX_PROVIDER_OPTIONS.map((provider) => (
            <li key={provider.id}>
              <strong>{provider.label}</strong>
              <span>{provider.description}</span>
            </li>
          ))}
        </ul>
        <AdminActionForm action={syncCurrencyRates} className="admin-fx-sync">
          <button type="submit" className="admin-secondary-action">
            <Icon i="refresh-cw" size={15} /> Actualiser les taux maintenant
          </button>
          <p className="admin-fx-last-sync">
            {lastSync
              ? `Dernière actualisation : ${lastSync} — ${settings?.lastSyncMessage ?? ""}`
              : "Aucune actualisation effectuée : les taux ci-dessous sont ceux du catalogue."}
          </p>
        </AdminActionForm>
      </section>

      <section className="admin-panel admin-language-section">
        <div className="admin-section-heading">
          <div>
            <h2>Monnaies proposées aux clients</h2>
            <p>
              Seules les monnaies affichées apparaissent dans le sélecteur de la page crédits du tableau de bord
              client. Le franc CFA (XOF) reste toujours disponible. Une monnaie « auto » suit les taux du service
              choisi ; désactive « auto » pour fixer le taux à la main.
            </p>
          </div>
          <span className="admin-status is-success">
            {enabledCount} affichée{enabledCount > 1 ? "s" : ""} / {catalog.length}
          </span>
        </div>
        <div className="admin-currency-list">
          <div className="admin-currency-row is-head" aria-hidden="true">
            <span>Monnaie</span>
            <span>Nom</span>
            <span>Symbole</span>
            <span>Unités pour 1 $</span>
            <span>Décimales</span>
            <span>Auto</span>
            <span>Actions</span>
          </div>
          {catalog.map((currency) => {
            const formId = `currency-edit-${currency.code}`;
            const locked = currency.code === BASE_CURRENCY_CODE;
            const pivot = currency.code === PIVOT_CURRENCY_CODE;
            const usedBy = countryCountByCurrency[currency.code] ?? 0;
            return (
              <div className={`admin-currency-row ${currency.enabled ? "" : "is-hidden"}`} key={currency.code}>
                <div className="admin-currency-id">
                  <span className="admin-catalog-icon">{currency.symbol}</span>
                  <div>
                    <strong>{currency.code}</strong>
                    <small>
                      {locked ? "Par défaut" : currency.enabled ? "Affichée" : "Masquée"}
                      {usedBy ? ` · ${usedBy} pays` : ""}
                    </small>
                  </div>
                </div>
                <label className="admin-currency-field" data-label="Nom">
                  <input form={formId} name="label" defaultValue={currency.label} required maxLength={80} aria-label={`Nom ${currency.code}`} />
                </label>
                <label className="admin-currency-field" data-label="Symbole">
                  <input form={formId} name="symbol" defaultValue={currency.symbol} required maxLength={8} aria-label={`Symbole ${currency.code}`} />
                </label>
                <label className="admin-currency-field" data-label="Unités pour 1 $">
                  <input
                    form={formId}
                    name="unitsPerUsd"
                    type="number"
                    step="any"
                    min="0"
                    defaultValue={currency.unitsPerUsd}
                    readOnly={pivot}
                    required
                    aria-label={`${currency.code} pour 1 dollar`}
                  />
                  <small>
                    {SAMPLE_XOF.toLocaleString("fr-FR")} FCFA ≈ {formatCreditPrice(SAMPLE_XOF, currency.code, catalog)}
                  </small>
                </label>
                <label className="admin-currency-field" data-label="Décimales">
                  <input form={formId} name="decimals" type="number" min="0" max="4" defaultValue={currency.decimals} required aria-label={`Décimales ${currency.code}`} />
                </label>
                <label className="admin-currency-field admin-currency-auto" data-label="Auto">
                  {pivot ? (
                    <span>—</span>
                  ) : (
                    <input form={formId} name="autoUpdate" type="checkbox" defaultChecked={currency.autoUpdate ?? true} aria-label={`Taux automatique ${currency.code}`} />
                  )}
                </label>
                <div className="admin-currency-actions">
                  <AdminActionForm id={formId} action={saveCurrency}>
                    <input type="hidden" name="code" value={currency.code} />
                    <button type="submit" className="admin-secondary-action" title="Enregistrer">
                      <Icon i="save" size={15} /> Enregistrer
                    </button>
                  </AdminActionForm>
                  {locked ? null : (
                    <AdminActionForm action={toggleCurrency}>
                      <input type="hidden" name="code" value={currency.code} />
                      <button className="admin-secondary-action" type="submit">
                        <Icon i={currency.enabled ? "eye-off" : "eye"} size={15} />{" "}
                        {currency.enabled ? "Masquer" : "Afficher"}
                      </button>
                    </AdminActionForm>
                  )}
                  {locked || pivot ? null : (
                    <AdminActionForm action={deleteCurrency}>
                      <input type="hidden" name="code" value={currency.code} />
                      <button className="admin-secondary-action is-danger" type="submit" title="Supprimer">
                        <Icon i="trash-2" size={15} />
                      </button>
                    </AdminActionForm>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="admin-panel admin-language-section">
        <div className="admin-section-heading">
          <div>
            <h2>Ajouter une monnaie</h2>
            <p>
              Utilise le code ISO à 3 lettres (ex. XAF, MAD, ZAR) et le nombre d’unités qui valent 1 $. « Actualiser les
              taux » pourra ensuite le tenir à jour.
            </p>
          </div>
        </div>
        <AdminActionForm action={createCurrency} className="admin-currency-add">
          <div className="admin-editor-field">
            <span>Code ISO</span>
            <input name="code" placeholder="MAD" required minLength={3} maxLength={3} style={{ textTransform: "uppercase" }} />
          </div>
          <div className="admin-editor-field">
            <span>Nom</span>
            <input name="label" placeholder="Dirham marocain (MAD)" required maxLength={80} />
          </div>
          <div className="admin-editor-field">
            <span>Symbole</span>
            <input name="symbol" placeholder="MAD" required maxLength={8} />
          </div>
          <div className="admin-editor-field">
            <span>Unités pour 1 $</span>
            <input name="unitsPerUsd" type="number" step="any" min="0" placeholder="10" required />
          </div>
          <div className="admin-editor-field">
            <span>Décimales</span>
            <AdminSelect
              name="decimals"
              ariaLabel="Décimales"
              defaultValue="2"
              options={[0, 1, 2, 3, 4].map((digits) => ({ value: String(digits), label: String(digits) }))}
            />
          </div>
          <label className="admin-editor-check">
            <input name="autoUpdate" type="checkbox" defaultChecked />
            <span>Taux mis à jour automatiquement</span>
          </label>
          <div className="admin-editor-actions">
            <button type="submit">
              <Icon i="plus" size={16} /> Ajouter la monnaie
            </button>
          </div>
        </AdminActionForm>
      </section>
    </>
  );
}
