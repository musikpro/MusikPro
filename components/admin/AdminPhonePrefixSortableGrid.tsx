"use client";
import Link from "next/link";
import { useActionState } from "react";
import {
  deletePhonePrefix,
  reorderPhonePrefixes,
  togglePhonePrefix,
  type PhonePrefixActionState,
} from "@/app/admin/phone-prefixes/actions";
import Icon from "@/components/banani/Icon";
import { useAdminActionToast } from "./useAdminActionToast";
import AdminDeletePhonePrefixButton from "./AdminDeletePhonePrefixButton";
import AdminSortableGrid from "./AdminSortableGrid";

function TogglePhonePrefixForm({ id, active }: { id: string; active: boolean }) {
  const [state, formAction, pending] = useActionState<PhonePrefixActionState, FormData>(togglePhonePrefix, null);
  useAdminActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(active)} />
      <button className="admin-secondary-action" type="submit" disabled={pending}>
        <Icon i={active ? "pause" : "play"} size={15} />
        {active ? "Désactiver" : "Activer"}
      </button>
    </form>
  );
}

function DeletePhonePrefixForm({ id, name }: { id: string; name: string }) {
  const [state, formAction, pending] = useActionState<PhonePrefixActionState, FormData>(deletePhonePrefix, null);
  useAdminActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <AdminDeletePhonePrefixButton name={name} pending={pending} />
    </form>
  );
}

export type SortablePhonePrefix = {
  id: string;
  countryCode: string;
  countryName: string;
  flag: string;
  dialCode: string;
  digits: number;
  active: boolean;
  sortOrder: number;
};

export default function AdminPhonePrefixSortableGrid({ prefixes }: { prefixes: SortablePhonePrefix[] }) {
  return (
    <AdminSortableGrid
      items={prefixes}
      onReorder={reorderPhonePrefixes}
      className="admin-music-style-grid admin-phone-prefix-grid"
      itemLabel={(prefix) => prefix.countryName}
      renderItem={(prefix, context) => (
        <article
          className={`admin-catalog-card admin-music-style-card admin-phone-prefix-card ${prefix.active ? "is-active" : ""} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
        >
          <div className="admin-catalog-card-head">
            <span className="admin-catalog-icon" aria-hidden="true">
              {prefix.flag}
            </span>
            <span className={`admin-status ${prefix.active ? "is-success" : "is-pending"}`}>
              {prefix.active ? "Actif" : "Désactivé"}
            </span>
          </div>
          <h2>{prefix.countryName}</h2>
          <p>{prefix.dialCode}</p>
          <small>Ordre {context.index + 1}</small>
          <footer className="admin-style-actions">
            <Link className="admin-secondary-action admin-style-edit" href={`/admin/phone-prefixes/${prefix.id}`}>
              <Icon i="pencil" size={15} /> Modifier
            </Link>
            <TogglePhonePrefixForm id={prefix.id} active={prefix.active} />
            <DeletePhonePrefixForm id={prefix.id} name={prefix.countryName} />
          </footer>
        </article>
      )}
      renderPreview={(prefix) => (
        <>
          <span className="admin-catalog-icon">{prefix.flag}</span>
          <strong>{prefix.countryName}</strong>
          <Icon i="grip-vertical" size={18} />
        </>
      )}
    />
  );
}
