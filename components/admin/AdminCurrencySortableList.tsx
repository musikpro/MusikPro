"use client";

import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSortableGrid from "@/components/admin/AdminSortableGrid";
import Icon from "@/components/banani/Icon";
import {
  deleteCurrency,
  reorderCurrencies,
  saveCurrency,
  toggleCurrency,
} from "@/app/admin/languages/currency-actions";
import {
  BASE_CURRENCY_CODE,
  formatCreditPrice,
  PIVOT_CURRENCY_CODE,
  type CreditCurrency,
} from "@/lib/credit-plans/currency";

const SAMPLE_XOF = 1_000;

/**
 * Liste des monnaies proposées aux clients, réordonnable par glisser-déposer : réutilise le composant commun
 * AdminSortableGrid (poignée, aperçu, flèches du clavier, enregistrement de l'ordre) avec des lignes de formulaire
 * au lieu de cartes. L'ordre enregistré est celui du sélecteur de monnaie côté client.
 */
export default function AdminCurrencySortableList({
  catalog,
  countryCountByCurrency,
}: {
  catalog: CreditCurrency[];
  countryCountByCurrency: Record<string, number>;
}) {
  const items = catalog.map((currency) => ({ ...currency, id: currency.code }));
  return (
    <div className="admin-currency-list">
      <AdminSortableGrid
        items={items}
        onReorder={reorderCurrencies}
        className="admin-currency-sortable"
        contain
        hint="Saisis une monnaie par sa poignée pour changer l’ordre."
        header={
          <div className="admin-currency-row is-head has-handle" aria-hidden="true">
            <span>Monnaie</span>
            <span>Nom</span>
            <span>Symbole</span>
            <span>Unités pour 1 $</span>
            <span>Décimales</span>
            <span>Auto</span>
            <span>Actions</span>
          </div>
        }
        itemLabel={(currency) => currency.code}
        renderPreview={(currency) => (
          <>
            <span className="admin-catalog-icon">{currency.symbol}</span>
            <strong>
              {currency.code} — {currency.label}
            </strong>
            <Icon i="grip-vertical" size={18} />
          </>
        )}
        renderItem={(currency, context) => {
          const formId = `currency-edit-${currency.code}`;
          const locked = currency.code === BASE_CURRENCY_CODE;
          const pivot = currency.code === PIVOT_CURRENCY_CODE;
          const usedBy = countryCountByCurrency[currency.code] ?? 0;
          return (
            <div
              className={`admin-currency-row has-handle ${currency.enabled ? "" : "is-hidden"} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
            >
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
                <input
                  form={formId}
                  name="label"
                  defaultValue={currency.label}
                  required
                  maxLength={80}
                  aria-label={`Nom ${currency.code}`}
                />
              </label>
              <label className="admin-currency-field" data-label="Symbole">
                <input
                  form={formId}
                  name="symbol"
                  defaultValue={currency.symbol}
                  required
                  maxLength={8}
                  aria-label={`Symbole ${currency.code}`}
                />
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
                <input
                  form={formId}
                  name="decimals"
                  type="number"
                  min="0"
                  max="4"
                  defaultValue={currency.decimals}
                  required
                  aria-label={`Décimales ${currency.code}`}
                />
              </label>
              <label className="admin-currency-field admin-currency-auto" data-label="Auto">
                {pivot ? (
                  <span>—</span>
                ) : (
                  <input
                    form={formId}
                    name="autoUpdate"
                    type="checkbox"
                    defaultChecked={currency.autoUpdate ?? true}
                    aria-label={`Taux automatique ${currency.code}`}
                  />
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
        }}
      />
    </div>
  );
}
