import { asc } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { paymentProviderConfigs, planProviderMappings, plans } from "@/db/schema";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import AdminSecretField from "@/components/admin/AdminSecretField";
import { requireAdmin } from "@/lib/auth/session";
import { getChariowConfiguration } from "@/lib/payments/chariow-config";
import { listChariowProducts } from "@/lib/payments/providers/chariow";
import { PaymentProviderHttpError } from "@/lib/payments/provider-base";
import { paymentWebhookUrl } from "@/lib/payments/webhook-url";
import AdminChariowProducts from "@/components/admin/AdminChariowProducts";
import { saveChariowProvider } from "../actions";

function InfoTip({ text }: { text: string }) {
  return (
    <span className="admin-info-tip" tabIndex={0} aria-label={text}>
      <Icon i="info" size={14} />
      <span role="tooltip">{text}</span>
    </span>
  );
}

export default async function ChariowProviderPage() {
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
  // Public HTTPS base (PAYMENT_WEBHOOK_BASE_URL, e.g. an ngrok tunnel in development) — never localhost.
  let webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://votre-domaine.com"}/api/webhooks/chariow`;
  try {
    webhookUrl = paymentWebhookUrl("chariow");
  } catch {}
  try {
    const stored = await getChariowConfiguration();
    apiLast4 = stored.config.apiKey?.last4 || "";
    webhookLast4 = stored.config.webhookSecret?.last4 || "";
    if (stored.webhookSecret) webhookUrl += `?secret=${encodeURIComponent(stored.webhookSecret)}`;
  } catch {}
  let chariowProducts: Awaited<ReturnType<typeof listChariowProducts>> = [];
  let chariowProductsError = false;
  // Readable cause shown in the field tooltip (HTTP status from Chariow, or the error kind) — never the key itself.
  let chariowProductsReason = "";
  try {
    chariowProducts = await listChariowProducts();
  } catch (error) {
    chariowProductsError = true;
    chariowProductsReason =
      error instanceof PaymentProviderHttpError
        ? `Chariow a répondu HTTP ${error.status}${error.status === 401 || error.status === 403 ? " : clé API refusée" : ""}.`
        : `Réponse inattendue de Chariow (${error instanceof Error ? error.name : "erreur"}).`;
  }
  const chariowProductOptions = chariowProducts.map((product) => ({
    value: product.id,
    label: product.price ? `${product.name} — ${product.price}` : product.name,
  }));

  return (
    <AdminPage>
      <AdminBackLink href="/admin/payment-providers" label="Passerelles" />
      <AdminPageHeader
        eyebrow="Paiements"
        title="Chariow"
        description="Mobile Money et carte bancaire via une page de paiement sécurisée."
      />

      <div className="admin-payment-provider-layout">
        <section className="admin-panel admin-provider-card admin-provider-card-featured">
          <div className="admin-provider-heading">
            <span className="admin-catalog-icon">
              <Icon i="credit-card" size={20} />
            </span>
            <div>
              <h2>Chariow</h2>
              <p>Mobile Money et carte bancaire via une page de paiement sécurisée.</p>
            </div>
            <span className={`admin-status ${current?.enabled && apiLast4 ? "is-success" : "is-pending"}`}>
              {current?.enabled && apiLast4 ? "Actif" : "À configurer"}
            </span>
          </div>
          <AdminActionForm action={saveChariowProvider} className="admin-stack-form admin-chariow-form">
            <div className="admin-editor-grid">
              <div className="admin-editor-field admin-editor-field-wide">
                <span>
                  Clé API Chariow{" "}
                  <InfoTip text="Copie la clé API privée depuis ton espace Chariow. Elle est chiffrée avant stockage et ne sera jamais réaffichée. Le champ reste verrouillé une fois configuré; clique sur « Modifier » pour la remplacer." />
                </span>
                <AdminSecretField
                  name="apiKey"
                  configured={Boolean(apiLast4)}
                  placeholder={
                    apiLast4
                      ? `Clé enregistrée ••••${apiLast4} — laisser vide pour conserver`
                      : "Saisir la clé API Chariow"
                  }
                />
              </div>
              <div className="admin-editor-field admin-editor-field-wide">
                <span>
                  Secret du webhook{" "}
                  <InfoTip text="Secret placé dans l’URL Pulse pour authentifier Chariow. Laisse vide pour le générer ou conserver l’existant. Le champ reste verrouillé une fois configuré; clique sur « Modifier » pour le remplacer." />
                </span>
                <AdminSecretField
                  name="webhookSecret"
                  configured={Boolean(webhookLast4)}
                  placeholder={
                    webhookLast4
                      ? `Secret enregistré ••••${webhookLast4} — laisser vide pour conserver`
                      : "Laisser vide pour générer automatiquement"
                  }
                />
              </div>
              <label className="admin-editor-field">
                <span>
                  Priorité <InfoTip text="Ordre du routeur. Chariow est actuellement l’unique passerelle proposée." />
                </span>
                <input name="priority" type="number" defaultValue={current?.priority ?? 10} min="1" max="999" />
              </label>
              <div className="admin-editor-field">
                <span>
                  Mode <InfoTip text="Passe en production seulement après un paiement de test réussi." />
                </span>
                <AdminSelect
                  name="mode"
                  defaultValue={current?.mode ?? "live"}
                  ariaLabel="Mode Chariow"
                  options={[
                    { value: "sandbox", label: "Test / Sandbox" },
                    { value: "live", label: "Production" },
                  ]}
                />
              </div>
              <label className="admin-check-control">
                <input type="checkbox" name="enabled" defaultChecked={current?.enabled} />
                <span>Activer Chariow</span>
              </label>
            </div>
            <button className="admin-form-submit" type="submit">
              <Icon i="save" size={16} />
              Enregistrer Chariow
            </button>
          </AdminActionForm>
          <div className="admin-webhook-box">
            <div>
              <strong>
                URL du webhook Pulse{" "}
                <InfoTip text="Copie cette URL complète dans Chariow. Chaque notification déclenche ensuite une vérification directe de la vente avant l’ajout des crédits." />
              </strong>
              <code>{webhookUrl}</code>
            </div>
          </div>
        </section>

        <section className="admin-panel admin-chariow-products">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="package-check" size={18} />
              </span>
              <div>
                <h2>Produits Chariow</h2>
                <p>Associe chaque offre MusikPro à son produit créé dans Chariow.</p>
              </div>
            </div>
          </div>
          <AdminChariowProducts
            plans={allPlans.map((plan) => ({ id: plan.id, name: plan.name }))}
            productOptions={chariowProductOptions}
            productsError={chariowProductsError}
            productsReason={chariowProductsReason}
            mappings={chariowMappings.map((mapping) => {
              const metadata = (mapping.metadata || {}) as { productName?: string };
              const plan = planMap.get(mapping.planId);
              return {
                planId: mapping.planId,
                planName: plan?.name || mapping.planId,
                productName: metadata.productName || plan?.name || "Produit Chariow",
                externalProductId: mapping.externalProductId || "",
              };
            })}
          />
        </section>
      </div>
    </AdminPage>
  );
}
