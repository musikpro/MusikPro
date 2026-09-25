"use client";

import Link from "next/link";
import { deletePlan, reorderPlans, togglePlan } from "@/app/admin/plans/actions";
import Icon from "@/components/banani/Icon";
import { getGenerationCount, getVersionCount, type CreditPlanOption } from "@/lib/credit-plans/catalog";
import AdminActionForm from "./AdminActionForm";
import AdminDeletePlanButton from "./AdminDeletePlanButton";
import AdminSortableGrid from "./AdminSortableGrid";

export default function AdminCreditPlanSortableGrid({
  plans,
  versionsPerGeneration,
}: {
  plans: CreditPlanOption[];
  versionsPerGeneration: number;
}) {
  return (
    <AdminSortableGrid
      items={plans}
      onReorder={reorderPlans}
      className="admin-credit-plan-grid"
      itemLabel={(plan) => plan.name}
      renderItem={(plan, context) => (
        <article
          className={`admin-catalog-card admin-music-style-card admin-credit-plan-card ${plan.active ? "is-active" : ""} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
        >
          <div className="admin-catalog-card-head">
            <span className="admin-catalog-icon">
              <Icon i="coins" size={21} />
            </span>
            <span className={`admin-status ${plan.active ? "is-success" : "is-pending"}`}>
              {plan.active ? "Active" : "Désactivée"}
            </span>
          </div>
          <h2>{plan.name}</h2>
          <p>{plan.description}</p>
          <div className="admin-plan-credit-summary">
            <strong>{plan.credits} crédits</strong>
            <span>
              {getGenerationCount(plan.credits)} générations · jusqu’à{" "}
              {getVersionCount(plan.credits, undefined, versionsPerGeneration)} versions
            </span>
          </div>
          <strong className="admin-credit-plan-price">{plan.priceValue.toLocaleString("fr-FR")} FCFA</strong>
          <small>
            Ordre {context.index + 1} · code {plan.code}
          </small>
          <footer className="admin-style-actions">
            <Link className="admin-secondary-action admin-style-edit" href={`/admin/plans/${plan.id}`}>
              <Icon i="pencil" size={15} /> Modifier
            </Link>
            <AdminActionForm action={togglePlan}>
              <input type="hidden" name="id" value={plan.id} />
              <input type="hidden" name="active" value={String(plan.active)} />
              <button className="admin-secondary-action" type="submit">
                <Icon i={plan.active ? "pause" : "play"} size={15} />
                {plan.active ? "Désactiver" : "Activer"}
              </button>
            </AdminActionForm>
            <AdminActionForm action={deletePlan}>
              <input type="hidden" name="id" value={plan.id} />
              <AdminDeletePlanButton name={plan.name} />
            </AdminActionForm>
          </footer>
        </article>
      )}
      renderPreview={(plan) => (
        <>
          <span className="admin-catalog-icon">
            <Icon i="coins" size={21} />
          </span>
          <strong>{plan.name}</strong>
          <Icon i="grip-vertical" size={18} />
        </>
      )}
    />
  );
}
