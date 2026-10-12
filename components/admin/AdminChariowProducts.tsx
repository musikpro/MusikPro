"use client";

import { useRef, useState } from "react";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import { deletePlanMapping, savePlanMapping } from "@/app/admin/payment-providers/actions";

export type ChariowMappingRow = {
  planId: string;
  planName: string;
  productName: string;
  externalProductId: string;
};

type Props = {
  plans: { id: string; name: string }[];
  /** Produits détectés chez Chariow ; vide si la détection a échoué ou si la clé n'est pas enregistrée. */
  productOptions: { value: string; label: string }[];
  productsError: boolean;
  productsReason: string;
  mappings: ChariowMappingRow[];
};

function InfoTip({ text }: { text: string }) {
  return (
    <span className="admin-info-tip" tabIndex={0} aria-label={text}>
      <Icon i="info" size={14} />
      <span role="tooltip">{text}</span>
    </span>
  );
}

/**
 * Formulaire unique d'ajout ET de modification des produits Chariow : « Modifier » dans la liste
 * charge la ligne dans le formulaire du haut (identifiant Chariow verrouillé), « Enregistrer » applique.
 */
export default function AdminChariowProducts({
  plans,
  productOptions,
  productsError,
  productsReason,
  mappings,
}: Props) {
  const [editing, setEditing] = useState<ChariowMappingRow | null>(null);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [formKey, setFormKey] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setEditing(null);
    setPlanId(plans[0]?.id ?? "");
    setFormKey((key) => key + 1);
  };

  const startEdit = (row: ChariowMappingRow) => {
    setEditing(row);
    setPlanId(row.planId);
    setFormKey((key) => key + 1);
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      formRef.current?.querySelector<HTMLInputElement>('input[name="productName"]')?.focus({ preventScroll: true });
    });
  };

  return (
    <>
      <div ref={formRef}>
        <AdminActionForm key={formKey} action={savePlanMapping} className="admin-product-create-form" onSuccess={reset}>
          <input type="hidden" name="provider" value="chariow" />
          {editing ? <input type="hidden" name="previousPlanId" value={editing.planId} /> : null}
          {editing ? (
            <p className="admin-product-edit-banner" role="status">
              <Icon i="pencil" size={14} />
              Modification de <strong>{editing.productName}</strong>
            </p>
          ) : null}
          <div className="admin-editor-field">
            <span>
              Offre MusikPro <InfoTip text="Choisis l’offre de crédits qui déclenchera ce produit Chariow." />
            </span>
            <AdminSelect
              name="planId"
              ariaLabel="Offre MusikPro"
              value={planId}
              onValueChange={setPlanId}
              options={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
            />
          </div>
          <label className="admin-editor-field">
            <span>
              Nom personnalisé{" "}
              <InfoTip text="Nom interne libre. Tu peux le modifier à tout moment sans changer le code ni le nom de l’offre." />
            </span>
            <input
              name="productName"
              placeholder="Ex. Pack Découverte Chariow"
              defaultValue={editing?.productName ?? ""}
              required
            />
          </label>
          {editing ? (
            <label className="admin-editor-field">
              <span>
                Identifiant Chariow{" "}
                <InfoTip text="Verrouillé pendant la modification pour éviter de casser le lien avec Chariow par erreur. Pour utiliser un autre produit, supprime cette ligne puis ajoute-en une nouvelle." />
              </span>
              <input
                name="externalProductId"
                defaultValue={editing.externalProductId}
                readOnly
                aria-readonly="true"
                className="admin-input-locked"
                required
              />
            </label>
          ) : productOptions.length ? (
            <div className="admin-editor-field">
              <span>
                Produit Chariow{" "}
                <InfoTip text="Détecté automatiquement depuis ton compte Chariow (clé API enregistrée ci-dessus). Recharge la page après avoir créé un nouveau produit côté Chariow." />
              </span>
              <AdminSelect
                name="externalProductId"
                ariaLabel="Produit Chariow"
                options={[{ value: "", label: "— Sélectionner un produit —" }, ...productOptions]}
              />
            </div>
          ) : (
            <label className="admin-editor-field">
              <span>
                Identifiant du produit{" "}
                <InfoTip
                  text={
                    productsError
                      ? `La détection automatique a échoué (${productsReason}). Saisis l’identifiant exact copié depuis ton espace Chariow.`
                      : "Identifiant exact du produit copié depuis ton espace Chariow. La détection automatique nécessite d’enregistrer d’abord la clé API ci-dessus."
                  }
                />
              </span>
              <input name="externalProductId" placeholder="prod_..." required />
            </label>
          )}
          <div className={editing ? "admin-product-form-actions" : undefined}>
            <button className="admin-form-submit" type="submit">
              <Icon i={editing ? "save" : "plus"} size={16} />
              {editing ? "Enregistrer les modifications" : "Ajouter le produit"}
            </button>
            {editing ? (
              <button type="button" className="admin-secondary-action" onClick={reset}>
                <Icon i="x" size={15} />
                Annuler
              </button>
            ) : null}
          </div>
        </AdminActionForm>
      </div>
      <div className="admin-mapping-list">
        {mappings.length ? (
          mappings.map((mapping) => {
            const deleteFormId = `chariow-mapping-delete-${mapping.planId}`;
            const isEditing = editing?.planId === mapping.planId;
            return (
              <div key={mapping.planId} className={`admin-product-row${isEditing ? " is-editing" : ""}`}>
                <div className="admin-product-summary">
                  <span className="admin-product-plan">
                    Offre : <strong>{mapping.planName}</strong>
                  </span>
                  <strong>{mapping.productName}</strong>
                  <code>{mapping.externalProductId}</code>
                </div>
                <AdminActionForm
                  id={deleteFormId}
                  action={deletePlanMapping}
                  onSuccess={() => {
                    if (isEditing) reset();
                  }}
                >
                  <input type="hidden" name="planId" value={mapping.planId} />
                  <input type="hidden" name="provider" value="chariow" />
                </AdminActionForm>
                <div className="admin-product-actions">
                  <button
                    type="button"
                    className="admin-secondary-action"
                    aria-label={`Modifier ${mapping.productName}`}
                    onClick={() => startEdit(mapping)}
                  >
                    <Icon i="pencil" size={15} />
                    Modifier
                  </button>
                  <button
                    type="submit"
                    form={deleteFormId}
                    className="admin-secondary-action is-danger"
                    aria-label={`Supprimer ${mapping.productName}`}
                  >
                    <Icon i="trash-2" size={15} />
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="admin-empty-state">
            <Icon i="package-open" size={22} />
            <strong>Aucun produit configuré</strong>
            <p>Ajoute ton premier produit Chariow avec le formulaire ci-dessus.</p>
          </div>
        )}
      </div>
    </>
  );
}
