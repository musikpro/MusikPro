"use client";

import { useDemo } from "./DemoProvider";
import { InlineNotice } from "@/components/ui/inline-notice";
import MusikSelect from "./MusikSelect";
import { answerErrorText } from "./occasion-field-errors";
import type { AnswerErrorCode } from "@/lib/occasion-fields/answers";
import { translate as t, localizeField } from "@/lib/i18n/translate";
import type { OccasionFieldClientDefinition } from "@/lib/occasion-fields/types";

function FieldLabel({ field, htmlFor }: { field: OccasionFieldClientDefinition; htmlFor?: string }) {
  const label = localizeField(field.label, field.translations, "label");
  const help = field.helpText ? localizeField(field.helpText, field.translations, "helpText") : "";
  return (
    <div className="occasion-field-heading">
      {field.icon ? <span aria-hidden="true">{field.icon}</span> : null}
      <label id={htmlFor ? undefined : `${field.id}-label`} htmlFor={htmlFor}>
        {label}
      </label>
      {help ? <small>{help}</small> : null}
    </div>
  );
}

export default function OccasionFieldsSection({
  errors,
  onChange,
}: {
  errors: Record<string, AnswerErrorCode>;
  onChange: (fieldId: string) => void;
}) {
  const demo = useDemo();
  if (!demo.occasionFields.length) return null;
  return (
    <div className="occasion-fields">
      {demo.occasionFields.map((field) => {
        const value = demo.details[field.id] ?? "";
        const error = errors[field.id];
        const set = (next: string) => {
          demo.setDetail(field.id, next);
          onChange(field.id);
        };
        const placeholder = field.placeholder ? localizeField(field.placeholder, field.translations, "placeholder") : undefined;
        const inputId = `occasion-field-${field.id}`;
        return (
          <section key={field.id} className="occasion-field story-recipient-card recipient-page-card">
            <FieldLabel field={field} htmlFor={field.type === "select" ? undefined : inputId} />
            {field.type === "short_text" ? (
              <input id={inputId} type="text" value={value} maxLength={field.config.maxLength ?? 100} placeholder={placeholder} aria-invalid={Boolean(error)} onChange={(event) => set(event.target.value)} />
            ) : null}
            {field.type === "long_text" ? (
              <textarea id={inputId} rows={3} value={value} maxLength={field.config.maxLength ?? 300} placeholder={placeholder} aria-invalid={Boolean(error)} onChange={(event) => set(event.target.value)} />
            ) : null}
            {field.type === "number" ? (
              <input id={inputId} type="number" inputMode="numeric" step={1} min={field.config.min} max={field.config.max} value={value} placeholder={placeholder} aria-invalid={Boolean(error)} onChange={(event) => set(event.target.value)} />
            ) : null}
            {field.type === "date" ? (
              <input id={inputId} type="date" value={value} aria-invalid={Boolean(error)} onChange={(event) => set(event.target.value)} />
            ) : null}
            {field.type === "select" && field.config.display === "dropdown" ? (
              <MusikSelect
                ariaLabel={localizeField(field.label, field.translations, "label")}
                placeholder={placeholder ?? t("Choisir…")}
                value={value}
                portal
                ariaInvalid={Boolean(error)}
                onChange={set}
                options={field.options.map((option, index) => ({
                  value: option.label,
                  label: localizeField(option.label, field.translations, `option${index}`),
                }))}
              />
            ) : null}
            {field.type === "select" && field.config.display !== "dropdown" ? (
              <div className="occasion-field-tiles" role="radiogroup" aria-labelledby={`${field.id}-label`}>
                {field.options.map((option, index) => (
                  <button
                    key={option.label}
                    type="button"
                    role="radio"
                    aria-checked={value === option.label}
                    className={`occasion-field-tile${value === option.label ? " is-selected" : ""}`}
                    onClick={() => set(value === option.label ? "" : option.label)}
                  >
                    <span aria-hidden="true">{option.emoji}</span>
                    {localizeField(option.label, field.translations, `option${index}`)}
                  </button>
                ))}
              </div>
            ) : null}
            {error ? (
              <InlineNotice tone="error" className="field-notice">
                {answerErrorText(error)}
              </InlineNotice>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
