import { desc } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { plans } from "@/db/schema";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { createPlan, togglePlan } from "./actions";

export default async function AdminPlansPage() {
  await requireAdmin();
  const db = getServiceDb();
  const rows = await db.select().from(plans).orderBy(desc(plans.createdAt));
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Monétisation"
        title="Packs & tarifs"
        description={`${rows.length} pack${rows.length > 1 ? "s" : ""} configuré${rows.length > 1 ? "s" : ""} dans Neon.`}
      />
      <section className="admin-plan-grid">
        {rows.map((plan) => (
          <article className={`admin-plan-card ${plan.active ? "is-active" : ""}`} key={plan.id}>
            <div className="admin-plan-card-head">
              <span className="admin-catalog-icon">
                <Icon i="package" size={20} />
              </span>
              <span className={`admin-status ${plan.active ? "is-success" : "is-pending"}`}>
                {plan.active ? "Actif" : "Désactivé"}
              </span>
            </div>
            <h2>{plan.name}</h2>
            <p>{plan.description || "Aucune description"}</p>
            <strong>
              {plan.amount.toLocaleString("fr-FR")} {plan.currency}
            </strong>
            <small>
              {plan.interval === "year" ? "par an" : "par mois"} · code {plan.code}
            </small>
            <form action={togglePlan}>
              <input type="hidden" name="id" value={plan.id} />
              <input type="hidden" name="active" value={String(plan.active)} />
              <button className="admin-secondary-action" type="submit">
                <Icon i={plan.active ? "pause" : "play"} size={16} />
                {plan.active ? "Désactiver" : "Activer"}
              </button>
            </form>
          </article>
        ))}
      </section>
      <section className="admin-panel admin-plan-create">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-icon">
              <Icon i="plus" size={18} />
            </span>
            <div>
              <h2>Nouveau pack</h2>
              <p>Créer une offre persistée dans Neon</p>
            </div>
          </div>
        </div>
        <form action={createPlan} className="admin-editor-grid">
          <label className="admin-editor-field">
            <span>Nom</span>
            <input name="name" required minLength={2} maxLength={80} placeholder="Ex. Populaire" />
          </label>
          <label className="admin-editor-field">
            <span>Code</span>
            <input name="code" required pattern="[a-z0-9_-]{2,40}" placeholder="populaire" />
          </label>
          <label className="admin-editor-field">
            <span>Montant</span>
            <input name="amount" type="number" min="1" step="1" required />
          </label>
          <label className="admin-editor-field">
            <span>Devise</span>
            <select name="currency" defaultValue="XOF">
              <option>XOF</option>
              <option>XAF</option>
              <option>NGN</option>
              <option>GHS</option>
              <option>KES</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
          </label>
          <label className="admin-editor-field">
            <span>Période</span>
            <select name="interval" defaultValue="month">
              <option value="month">Mensuel</option>
              <option value="year">Annuel</option>
            </select>
          </label>
          <label className="admin-editor-field">
            <span>Description</span>
            <input name="description" maxLength={500} placeholder="À qui s’adresse ce pack ?" />
          </label>
          <div className="admin-editor-actions is-wide">
            <button type="submit">
              <Icon i="plus" size={17} />
              Créer le pack
            </button>
          </div>
        </form>
      </section>
    </AdminPage>
  );
}
