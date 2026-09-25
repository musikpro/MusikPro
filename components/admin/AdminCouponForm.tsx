"use client";

import { useActionState } from "react";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { useAdminActionToast } from "@/components/admin/useAdminActionToast";
import type { CouponActionState } from "@/app/admin/coupons/actions";

type CouponFormValues = {
  id?: string;
  code?: string;
  type?: string;
  value?: number;
  description?: string;
  active?: boolean;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
  sortOrder?: number;
};

export default function AdminCouponForm({
  action,
  values = {},
}: {
  action: (previous: CouponActionState, formData: FormData) => Promise<CouponActionState>;
  values?: CouponFormValues;
}) {
  const editing = Boolean(values.id);
  const expiresAtDefault = values.expiresAt ? values.expiresAt.slice(0, 10) : "";
  const [state, formAction, pending] = useActionState<CouponActionState, FormData>(action, null);
  useAdminActionToast(state);
  return (
    <section className="admin-panel admin-editor-card">
      <form action={formAction} className="admin-editor-grid admin-occasion-editor-grid">
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
        <label className="admin-editor-field">
          <span>Code</span>
          <input
            name="code"
            required
            minLength={3}
            maxLength={32}
            defaultValue={values.code}
            placeholder="Ex. BIENVENUE10"
            style={{ textTransform: "uppercase" }}
          />
        </label>
        <label className="admin-editor-field">
          <span>Position d’affichage</span>
          <input name="sortOrder" required type="number" min="0" max="999" defaultValue={values.sortOrder ?? 100} />
        </label>
        <div className="admin-editor-field">
          <span>Type de réduction</span>
          <AdminSelect
            name="type"
            defaultValue={values.type ?? "percent"}
            ariaLabel="Type de réduction"
            options={[
              { value: "percent", label: "Pourcentage (%)" },
              { value: "fixed", label: "Montant fixe (XOF)" },
            ]}
          />
        </div>
        <label className="admin-editor-field">
          <span>Valeur</span>
          <input
            name="value"
            required
            type="number"
            min="1"
            max="1000000000"
            step="1"
            defaultValue={values.value}
            placeholder="Ex. 10 (pour 10 %) ou 1000 (pour 1000 XOF)"
          />
        </label>
        <label className="admin-editor-field">
          <span>Limite d’utilisation (optionnel)</span>
          <input
            name="maxRedemptions"
            type="number"
            min="1"
            max="1000000"
            defaultValue={values.maxRedemptions ?? ""}
            placeholder="Illimité si vide"
          />
        </label>
        <label className="admin-editor-field">
          <span>Date d’expiration (optionnel)</span>
          <input name="expiresAt" type="date" defaultValue={expiresAtDefault} />
        </label>
        <label className="admin-editor-field is-wide">
          <span>Description (usage interne)</span>
          <textarea
            name="description"
            maxLength={240}
            rows={3}
            defaultValue={values.description}
            placeholder="Ex. Campagne de lancement, réservé aux clients VIP…"
          />
        </label>
        <div className="admin-editor-field">
          <span>État</span>
          <AdminSelect
            name="active"
            defaultValue={String(values.active ?? true)}
            ariaLabel="État du code"
            options={[
              { value: "true", label: "Actif — utilisable par les clients" },
              { value: "false", label: "Désactivé — inutilisable" },
            ]}
          />
        </div>
        <div className="admin-editor-actions is-wide">
          <AdminBackLink href="/admin/coupons" label="Annuler" />
          <button type="submit" disabled={pending}>
            <Icon i={editing ? "save" : "plus"} size={17} />
            {editing ? "Enregistrer les modifications" : "Enregistrer le code"}
          </button>
        </div>
      </form>
    </section>
  );
}
