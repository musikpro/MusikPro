"use client";
import Link from "next/link";
import { useActionState } from "react";
import {
  deleteOccasionField,
  duplicateOccasionField,
  reorderOccasionFields,
  toggleOccasionField,
} from "@/app/admin/occasion-fields/actions";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import AdminSortableGrid from "@/components/admin/AdminSortableGrid";
import { useAdminActionToast, type AdminActionState } from "@/components/admin/useAdminActionToast";
import Icon from "@/components/banani/Icon";

export type SortableOccasionField = {
  id: string;
  label: string;
  icon: string;
  type: string;
  required: boolean;
  active: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  short_text: "Texte court",
  long_text: "Texte long",
  select: "Liste de choix",
  number: "Nombre",
  date: "Date",
};

function ToggleForm({ id, active }: { id: string; active: boolean }) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(toggleOccasionField, null);
  useAdminActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(active)} />
      <button className="admin-secondary-action" type="submit" disabled={pending}>
        <Icon i={active ? "pause" : "play"} size={15} /> {active ? "Désactiver" : "Activer"}
      </button>
    </form>
  );
}

function DeleteForm({ id, label }: { id: string; label: string }) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(deleteOccasionField, null);
  useAdminActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="admin-style-delete"
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm(`Supprimer définitivement le champ « ${label} » ?`)) event.preventDefault();
        }}
      >
        <Icon i="trash" size={15} /> Supprimer
      </button>
    </form>
  );
}

export default function AdminOccasionFieldSortableGrid({
  occasionId,
  fields,
  otherOccasions,
}: {
  occasionId: string;
  fields: SortableOccasionField[];
  otherOccasions: Array<{ id: string; name: string }>;
}) {
  return (
    <AdminSortableGrid
      items={fields}
      onReorder={reorderOccasionFields.bind(null, occasionId)}
      className="admin-music-style-grid admin-recipient-relation-grid admin-occasion-field-grid"
      itemLabel={(field) => field.label}
      renderItem={(field, context) => (
        <article
          className={`admin-catalog-card admin-music-style-card ${field.active ? "is-active" : ""} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
        >
          <div className="admin-catalog-card-head">
            <span className="admin-catalog-icon" aria-hidden="true">{field.icon || "📝"}</span>
            <span className={`admin-status ${field.active ? "is-success" : "is-pending"}`}>
              {field.active ? "Actif" : "Désactivé"}
            </span>
          </div>
          <h2>{field.label}</h2>
          <small>
            {TYPE_LABELS[field.type] ?? field.type}
            {field.required ? " · Obligatoire" : ""} · Ordre {context.index + 1}
          </small>
          <footer className="admin-style-actions">
            <Link
              className="admin-secondary-action admin-style-edit"
              href={`/admin/occasion-fields/${occasionId}/fields/${field.id}`}
            >
              <Icon i="pencil" size={15} /> Modifier
            </Link>
            <ToggleForm id={field.id} active={field.active} />
            <DeleteForm id={field.id} label={field.label} />
          </footer>
          {otherOccasions.length ? (
            <AdminActionForm action={duplicateOccasionField} className="admin-field-duplicate">
              <input type="hidden" name="id" value={field.id} />
              <AdminSelect
                name="targetOccasionId"
                ariaLabel={`Dupliquer ${field.label} vers`}
                placeholder="Vers…"
                defaultValue=""
                options={otherOccasions.map((occasion) => ({ value: occasion.id, label: occasion.name }))}
              />
              <button className="admin-secondary-action" type="submit">
                <Icon i="copy" size={15} /> Dupliquer
              </button>
            </AdminActionForm>
          ) : null}
        </article>
      )}
      renderPreview={(field) => (
        <>
          <span className="admin-catalog-icon">{field.icon || "📝"}</span>
          <strong>{field.label}</strong>
          <Icon i="grip-vertical" size={18} />
        </>
      )}
    />
  );
}
