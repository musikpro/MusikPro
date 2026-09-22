import { asc } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { paymentProviderConfigs, planProviderMappings, plans } from "@/db/schema";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import AdminSelect from "@/components/admin/AdminSelect";
import { requireAdmin } from "@/lib/auth/session";
import { getChariowConfiguration } from "@/lib/payments/chariow-config";
import { deletePlanMapping, saveChariowProvider, savePlanMapping } from "./actions";

function InfoTip({ text }: { text: string }) {
  return <span className="admin-info-tip" tabIndex={0} aria-label={text}><Icon i="info" size={14} /><span role="tooltip">{text}</span></span>;
}

export default async function PaymentProvidersPage() {
  await requireAdmin();
  const db = getServiceDb();
  const [configs, allPlans, mappings] = await Promise.all([
    db.select().from(paymentProviderConfigs),
    db.select().from(plans).orderBy(asc(plans.name)),
    db.select().from(planProviderMappings),
  ]);
  const current = configs.find((entry) => entry.provider === "chariow");
  const chariowMappings = mappings.filter((entry) => entry.provider === "chariow");
  const planMap = new Map(allPlans.map((plan) => [plan.id, plan]));
  let apiLast4 = "";
  let webhookLast4 = "";
  let webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://votre-domaine.com"}/api/webhooks/chariow`;
  try {
    const stored = await getChariowConfiguration();
    apiLast4 = stored.config.apiKey?.last4 || "";
    webhookLast4 = stored.config.webhookSecret?.last4 || "";
    if (stored.webhookSecret) webhookUrl += `?secret=${encodeURIComponent(stored.webhookSecret)}`;
  } catch {}

  return <AdminPage>
    <AdminPageHeader eyebrow="Paiements" title="Passerelles" description="Chariow est la passerelle active de MusikPro. L’architecture reste prête pour de futurs fournisseurs." />

    <div className="admin-payment-provider-layout">
    <section className="admin-panel admin-provider-card admin-provider-card-featured">
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon"><Icon i="credit-card" size={20} /></span>
        <div><h2>Chariow</h2><p>Mobile Money et carte bancaire via une page de paiement sécurisée.</p></div>
        <span className={`admin-status ${current?.enabled && apiLast4 ? "is-success" : "is-pending"}`}>{current?.enabled && apiLast4 ? "Actif" : "À configurer"}</span>
      </div>
      <form action={saveChariowProvider} className="admin-stack-form admin-chariow-form">
        <div className="admin-editor-grid">
          <label className="admin-editor-field admin-editor-field-wide"><span>Clé API Chariow <InfoTip text="Copie la clé API privée depuis ton espace Chariow. Elle est chiffrée avant stockage et ne sera jamais réaffichée." /></span><input type="password" name="apiKey" autoComplete="new-password" placeholder={apiLast4 ? `Clé enregistrée ••••${apiLast4} — laisser vide pour conserver` : "Saisir la clé API Chariow"} /></label>
          <label className="admin-editor-field admin-editor-field-wide"><span>Secret du webhook <InfoTip text="Secret placé dans l’URL Pulse pour authentifier Chariow. Laisse vide pour le générer ou conserver l’existant." /></span><input type="password" name="webhookSecret" autoComplete="new-password" placeholder={webhookLast4 ? `Secret enregistré ••••${webhookLast4} — laisser vide pour conserver` : "Laisser vide pour générer automatiquement"} /></label>
          <label className="admin-editor-field"><span>Priorité <InfoTip text="Ordre du routeur. Chariow est actuellement l’unique passerelle proposée." /></span><input name="priority" type="number" defaultValue={current?.priority ?? 10} min="1" max="999" /></label>
          <div className="admin-editor-field"><span>Mode <InfoTip text="Passe en production seulement après un paiement de test réussi." /></span><AdminSelect name="mode" defaultValue={current?.mode ?? "live"} ariaLabel="Mode Chariow" options={[{ value: "sandbox", label: "Test / Sandbox" }, { value: "live", label: "Production" }]} /></div>
          <label className="admin-check-control"><input type="checkbox" name="enabled" defaultChecked={current?.enabled} /><span>Activer Chariow</span></label>
        </div>
        <button className="admin-form-submit" type="submit"><Icon i="save" size={16} />Enregistrer Chariow</button>
      </form>
      <div className="admin-webhook-box"><div><strong>URL du webhook Pulse <InfoTip text="Copie cette URL complète dans Chariow. Chaque notification déclenche ensuite une vérification directe de la vente avant l’ajout des crédits." /></strong><code>{webhookUrl}</code></div></div>
    </section>

    <section className="admin-panel admin-chariow-products">
      <div className="admin-panel-heading"><div><span className="admin-panel-icon"><Icon i="package-check" size={18} /></span><div><h2>Produits Chariow</h2><p>Associe chaque offre MusikPro à son produit créé dans Chariow.</p></div></div></div>
      <form action={savePlanMapping} className="admin-product-create-form">
        <input type="hidden" name="provider" value="chariow" />
        <div className="admin-editor-field"><span>Offre MusikPro <InfoTip text="Choisis l’offre de crédits qui déclenchera ce produit Chariow." /></span><AdminSelect name="planId" ariaLabel="Offre MusikPro" options={allPlans.map((plan) => ({ value: plan.id, label: plan.name }))} /></div>
        <label className="admin-editor-field"><span>Nom personnalisé <InfoTip text="Nom interne libre. Tu peux le modifier à tout moment sans changer le code ni le nom de l’offre." /></span><input name="productName" placeholder="Ex. Pack Découverte Chariow" required /></label>
        <label className="admin-editor-field"><span>Identifiant du produit <InfoTip text="Identifiant exact du produit copié depuis ton espace Chariow." /></span><input name="externalProductId" placeholder="prod_..." required /></label>
        <button className="admin-form-submit" type="submit"><Icon i="plus" size={16} />Ajouter le produit</button>
      </form>
      <div className="admin-mapping-list">{chariowMappings.length ? chariowMappings.map((mapping) => {
        const metadata = (mapping.metadata || {}) as { productName?: string };
        const plan = planMap.get(mapping.planId);
        return <form action={savePlanMapping} key={mapping.id} className="admin-product-row">
          <input type="hidden" name="planId" value={mapping.planId} /><input type="hidden" name="provider" value="chariow" />
          <span className="admin-product-plan">Offre : <strong>{plan?.name || mapping.planId}</strong></span>
          <label><span>Nom du produit</span><input name="productName" defaultValue={metadata.productName || plan?.name || "Produit Chariow"} required /></label>
          <label><span>Identifiant Chariow</span><input name="externalProductId" defaultValue={mapping.externalProductId || ""} required /></label>
          <div className="admin-product-actions">
            <button type="submit" aria-label={`Enregistrer ${metadata.productName || plan?.name || "le produit"}`}><Icon i="save" size={15} /></button>
            <button type="submit" formAction={deletePlanMapping} className="is-danger" aria-label={`Supprimer ${metadata.productName || plan?.name || "le produit"}`}><Icon i="trash-2" size={15} /></button>
          </div>
        </form>;
      }) : <div className="admin-empty-state"><Icon i="package-open" size={22} /><strong>Aucun produit configuré</strong><p>Ajoute ton premier produit Chariow avec le formulaire ci-dessus.</p></div>}</div>
    </section>
    </div>

    <section className="admin-panel admin-future-provider"><span className="admin-panel-icon"><Icon i="plus" size={18} /></span><div><h2>Autres passerelles</h2><p>Emplacement prêt pour ajouter plus tard un fournisseur sans modifier le parcours client ni les crédits.</p></div><span className="admin-status is-pending">À venir</span></section>
  </AdminPage>;
}
