import { asc, desc, gte, sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import {
  paymentAttempts,
  paymentCountryRoutes,
  paymentProviderConfigs,
  planProviderMappings,
  plans,
} from "@/db/schema";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import AdminSelect from "@/components/admin/AdminSelect";
import { requireAdmin } from "@/lib/auth/session";
import { providerCapabilities } from "@/lib/payments/capabilities";
import { saveCountryRoute, savePlanMapping, saveProvider } from "./actions";

export default async function PaymentProvidersPage() {
  await requireAdmin();
  const db = getServiceDb();
  const [configs, routes, allPlans, mappings, attempts] = await Promise.all([
    db.select().from(paymentProviderConfigs).orderBy(asc(paymentProviderConfigs.priority)),
    db
      .select()
      .from(paymentCountryRoutes)
      .orderBy(asc(paymentCountryRoutes.country), asc(paymentCountryRoutes.priority)),
    db.select().from(plans).orderBy(asc(plans.name)),
    db.select().from(planProviderMappings),
    db
      .select()
      .from(paymentAttempts)
      .where(gte(paymentAttempts.createdAt, sql`now() - interval '24 hours'`))
      .orderBy(desc(paymentAttempts.createdAt))
      .limit(500),
  ]);
  const configMap = new Map(configs.map((entry) => [entry.provider, entry]));
  const mappingMap = new Map(mappings.map((entry) => [`${entry.planId}:${entry.provider}`, entry]));
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Paiements"
        title="Passerelles"
        description="Configure le Smart Router sans exposer les secrets des fournisseurs."
      />
      <section className="admin-provider-grid">
        {Object.entries(providerCapabilities).map(([provider, capability]) => {
          const config = configMap.get(provider);
          const providerAttempts = attempts.filter(
            (entry) => entry.provider === provider && ["checkout_created", "provider_error"].includes(entry.outcome),
          );
          const successes = providerAttempts.filter((entry) => entry.outcome === "checkout_created").length;
          const rate = providerAttempts.length ? Math.round((successes / providerAttempts.length) * 100) : null;
          const blocked = ["scaffold", "merchant-validation"].includes(capability.readiness);
          return (
            <article className="admin-panel admin-provider-card" key={provider}>
              <div className="admin-provider-heading">
                <span className="admin-catalog-icon">
                  <Icon i="waypoints" size={20} />
                </span>
                <div>
                  <h2>{provider}</h2>
                  <p>{capability.note}</p>
                </div>
                <span className={`admin-status ${config?.enabled ? "is-success" : "is-pending"}`}>
                  {config?.enabled ? "Actif" : capability.readiness}
                </span>
              </div>
              <div className="admin-provider-facts">
                <span>
                  <strong>{providerAttempts.length}</strong>Tentatives 24 h
                </span>
                <span>
                  <strong>{rate === null ? "—" : `${rate}%`}</strong>Succès checkout
                </span>
              </div>
              <form action={saveProvider} className="admin-provider-form">
                <input type="hidden" name="provider" value={provider} />
                <label className="admin-check-control">
                  <input type="checkbox" name="enabled" defaultChecked={config?.enabled} disabled={blocked} />
                  <span>Activer</span>
                </label>
                <label>
                  <span>Priorité</span>
                  <input name="priority" type="number" defaultValue={config?.priority ?? 100} min="1" max="999" />
                </label>
                <div className="admin-provider-field">
                  <span>Mode</span>
                  <AdminSelect
                    name="mode"
                    defaultValue={config?.mode ?? "sandbox"}
                    ariaLabel={`Mode ${provider}`}
                    options={[
                      { value: "sandbox", label: "Sandbox" },
                      { value: "live", label: "Live" },
                    ]}
                  />
                </div>
                <button type="submit">
                  <Icon i="save" size={16} />
                  Enregistrer
                </button>
              </form>
            </article>
          );
        })}
      </section>
      <section className="admin-insight-grid">
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="map-pinned" size={18} />
              </span>
              <div>
                <h2>Routage par pays</h2>
                <p>Priorité, moyens et devises autorisés</p>
              </div>
            </div>
          </div>
          <form action={saveCountryRoute} className="admin-stack-form">
            <div className="admin-editor-grid">
              <label className="admin-editor-field">
                <span>Pays ISO</span>
                <input name="country" placeholder="CI" maxLength={2} required />
              </label>
              <div className="admin-editor-field">
                <span>Fournisseur</span>
                <AdminSelect
                  name="provider"
                  ariaLabel="Fournisseur"
                  options={Object.entries(providerCapabilities)
                    .filter(([, capability]) => !["scaffold", "merchant-validation"].includes(capability.readiness))
                    .map(([provider]) => ({ value: provider, label: provider }))}
                />
              </div>
              <label className="admin-editor-field">
                <span>Priorité</span>
                <input name="priority" type="number" defaultValue="100" />
              </label>
              <label className="admin-editor-field">
                <span>Moyens</span>
                <input name="methods" placeholder="wave, orange_money" />
              </label>
              <label className="admin-editor-field">
                <span>Devises</span>
                <input name="currencies" placeholder="XOF, USD" />
              </label>
              <label className="admin-check-control">
                <input name="enabled" type="checkbox" defaultChecked />
                <span>Route active</span>
              </label>
            </div>
            <button className="admin-form-submit" type="submit">
              <Icon i="plus" size={16} />
              Ajouter ou modifier
            </button>
          </form>
          {routes.length ? (
            <div className="admin-route-list">
              {routes.map((route) => (
                <div key={route.id}>
                  <strong>
                    {route.country} → {route.provider}
                  </strong>
                  <span>
                    Priorité {route.priority} · {route.enabled ? "Active" : "Désactivée"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <Icon i="route" size={22} />
              <strong>Aucune route</strong>
              <p>Ajoute une première règle de routage.</p>
            </div>
          )}
        </article>
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="package-check" size={18} />
              </span>
              <div>
                <h2>Produits Chariow</h2>
                <p>Correspondance entre packs et produits externes</p>
              </div>
            </div>
          </div>
          <div className="admin-mapping-list">
            {allPlans.map((plan) => (
              <form action={savePlanMapping} key={plan.id}>
                <input type="hidden" name="planId" value={plan.id} />
                <input type="hidden" name="provider" value="chariow" />
                <label>
                  <span>{plan.name}</span>
                  <input
                    name="externalProductId"
                    placeholder="prd_..."
                    defaultValue={mappingMap.get(`${plan.id}:chariow`)?.externalProductId ?? ""}
                  />
                </label>
                <button type="submit" aria-label={`Enregistrer le mapping ${plan.name}`}>
                  <Icon i="save" size={15} />
                </button>
              </form>
            ))}
          </div>
        </article>
      </section>
    </AdminPage>
  );
}
