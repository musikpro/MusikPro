"use client";

import { useState } from "react";
import Icon from "@/components/banani/Icon";
import { AdminBackLink, AdminPage, AdminPageHeader, AdminSourceNotice } from "./AdminPage";
import AdminSelect from "./AdminSelect";

type Field = {
  label: string;
  placeholder?: string;
  value?: string;
  type?: "text" | "textarea" | "select";
  options?: string[];
};

export default function AdminDraftForm({
  eyebrow,
  title,
  description,
  backHref,
  fields,
  choices,
  note,
}: {
  eyebrow: string;
  title: string;
  description: string;
  backHref: string;
  fields: Field[];
  choices?: string[];
  note: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <AdminPage>
      <AdminBackLink href={backHref} />
      <AdminPageHeader eyebrow={eyebrow} title={title} description={description} />
      <AdminSourceNotice>{note}</AdminSourceNotice>
      <section className="admin-panel admin-editor-card">
        <div className="admin-editor-grid">
          {fields.map((field) => {
            const content =
              field.type === "textarea" ? (
                <textarea defaultValue={field.value} placeholder={field.placeholder} rows={5} />
              ) : field.type === "select" ? (
                <AdminSelect
                  defaultValue={field.value ?? field.options?.[0]}
                  options={(field.options ?? []).map((option) => ({ value: option, label: option }))}
                  ariaLabel={field.label}
                />
              ) : (
                <input defaultValue={field.value} placeholder={field.placeholder} />
              );
            return field.type === "select" ? (
              <div className="admin-editor-field" key={field.label}>
                <span>{field.label}</span>
                {content}
              </div>
            ) : (
              <label className={`admin-editor-field ${field.type === "textarea" ? "is-wide" : ""}`} key={field.label}>
                <span>{field.label}</span>
                {content}
              </label>
            );
          })}
        </div>
        {choices?.length ? (
          <fieldset className="admin-choice-fieldset">
            <legend>Sélection</legend>
            <div>
              {choices.map((choice) => {
                const active = selected.includes(choice);
                return (
                  <button
                    type="button"
                    className={active ? "is-active" : undefined}
                    aria-pressed={active}
                    key={choice}
                    onClick={() =>
                      setSelected((current) =>
                        active ? current.filter((item) => item !== choice) : [...current, choice],
                      )
                    }
                  >
                    <Icon i={active ? "circle-check" : "circle"} size={16} />
                    {choice}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}
        <div className="admin-editor-actions">
          <AdminBackLink href={backHref} label="Annuler" />
          <button type="button" disabled title="La source métier doit d’abord être créée">
            <Icon i="save" size={17} />
            Enregistrement à connecter
          </button>
        </div>
      </section>
    </AdminPage>
  );
}
