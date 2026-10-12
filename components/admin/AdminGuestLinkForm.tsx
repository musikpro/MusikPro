"use client";

import { useState } from "react";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { guestLinkUrl } from "@/lib/validation/guest-links";

type GuestLinkFormValues = {
  id?: string;
  label?: string;
  slug?: string;
  destination?: string;
  active?: boolean;
  note?: string;
};

export default function AdminGuestLinkForm({
  action,
  baseUrl,
  values = {},
}: {
  action: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  /** Origine publique du site, pour afficher le lien complet. */
  baseUrl: string;
  values?: GuestLinkFormValues;
}) {
  const editing = Boolean(values.id);
  const [slug, setSlug] = useState(values.slug ?? "");
  const cleanSlug = slug.trim().toLowerCase();
  return (
    <section className="admin-panel admin-editor-card">
      <AdminActionForm action={action} className="admin-editor-grid admin-occasion-editor-grid">
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
        <label className="admin-editor-field">
          <span>Nom du lien (usage interne)</span>
          <input
            name="label"
            required
            minLength={2}
            maxLength={80}
            defaultValue={values.label}
            placeholder="Ex. Pub TikTok — octobre"
          />
        </label>
        <label className="admin-editor-field">
          <span>Fin du lien</span>
          <input
            name="slug"
            required
            minLength={3}
            maxLength={40}
            pattern="[A-Za-z0-9]+(-[A-Za-z0-9]+)*"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="Ex. tiktok-octobre"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
        <p className="admin-editor-field is-wide" aria-live="polite">
          <span>Lien à coller dans la publicité</span>
          <strong style={{ wordBreak: "break-all" }}>
            {cleanSlug ? guestLinkUrl(baseUrl, cleanSlug) : `${baseUrl.replace(/\/+$/, "")}/g/…`}
          </strong>
        </p>
        <div className="admin-editor-field is-wide">
          <span>Où arrive le visiteur ?</span>
          <AdminSelect
            name="destination"
            defaultValue={values.destination ?? "create"}
            ariaLabel="Destination du lien"
            options={[
              { value: "create", label: "Directement au formulaire de création de chanson" },
              { value: "dashboard", label: "Sur le tableau de bord invité (accueil)" },
            ]}
          />
        </div>
        <div className="admin-editor-field">
          <span>État</span>
          <AdminSelect
            name="active"
            defaultValue={String(values.active ?? true)}
            ariaLabel="État du lien"
            options={[
              { value: "true", label: "Actif — le lien fonctionne" },
              { value: "false", label: "Désactivé — le lien ne fonctionne pas" },
            ]}
          />
        </div>
        <label className="admin-editor-field is-wide">
          <span>Note (usage interne)</span>
          <textarea
            name="note"
            maxLength={240}
            rows={3}
            defaultValue={values.note}
            placeholder="Ex. Campagne Facebook Bénin, public 25-40 ans…"
          />
        </label>
        <div className="admin-editor-actions is-wide">
          <AdminBackLink href="/admin/guest-links" label="Annuler" />
          <button type="submit">
            <Icon i={editing ? "save" : "plus"} size={17} />
            {editing ? "Enregistrer les modifications" : "Créer le lien"}
          </button>
        </div>
      </AdminActionForm>
    </section>
  );
}
