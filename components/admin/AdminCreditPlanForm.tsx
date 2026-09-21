import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import type { CreditPlanOption } from "@/lib/credit-plans/catalog";

export default function AdminCreditPlanForm({
  action,
  plan,
}: {
  action: (formData: FormData) => Promise<void>;
  plan?: CreditPlanOption;
}) {
  return (
    <form action={action} className="admin-editor-grid">
      {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
      <label className="admin-editor-field">
        <span>Nom de l’offre</span>
        <input name="name" required minLength={2} maxLength={80} defaultValue={plan?.name} placeholder="Ex. Essentiel" />
      </label>
      <label className="admin-editor-field">
        <span>Code interne</span>
        <input name="code" required pattern="[a-z0-9_-]{2,40}" defaultValue={plan?.code} placeholder="credits-10" />
      </label>
      <label className="admin-editor-field">
        <span>Nombre de crédits</span>
        <input name="credits" type="number" min="2" max="100000" step="1" required defaultValue={plan?.credits ?? 5} />
        <small>Chaque génération musicale consomme 2 crédits.</small>
      </label>
      <label className="admin-editor-field">
        <span>Prix de référence en FCFA</span>
        <input name="amount" type="number" min="1" max="1000000000" step="1" required defaultValue={plan?.priceValue} placeholder="1000" />
        <small>Les autres devises sont calculées automatiquement côté client.</small>
      </label>
      <label className="admin-editor-field is-wide">
        <span>Description</span>
        <textarea name="description" maxLength={500} rows={4} defaultValue={plan?.description} placeholder="À qui s’adresse cette offre ?" />
      </label>
      <label className="admin-editor-field">
        <span>Avantage affiché (optionnel)</span>
        <input name="bonus" maxLength={120} defaultValue={plan?.bonus ?? ""} placeholder="Ex. Meilleur rapport crédits-prix" />
      </label>
      <label className="admin-editor-field">
        <span>Position d’affichage</span>
        <input name="sortOrder" type="number" min="0" max="999" step="1" required defaultValue={plan?.sortOrder ?? 100} />
      </label>
      <div className="admin-editor-field">
        <span>État</span>
        <AdminSelect
          name="active"
          defaultValue={String(plan ? plan.active : true)}
          ariaLabel="État de l’offre"
          options={[
            { value: "true", label: "Active — visible pour les clients" },
            { value: "false", label: "Désactivée — masquée pour les clients" },
          ]}
        />
      </div>
      <label className="admin-editor-check">
        <input name="popular" type="checkbox" defaultChecked={plan?.popular ?? false} />
        <span>Mettre cette offre en avant</span>
      </label>
      <div className="admin-editor-actions is-wide">
        <AdminBackLink href="/admin/plans" label="Annuler" />
        <button type="submit">
          <Icon i={plan ? "save" : "plus"} size={17} />
          {plan ? "Enregistrer les modifications" : "Créer l’offre de crédits"}
        </button>
      </div>
    </form>
  );
}
