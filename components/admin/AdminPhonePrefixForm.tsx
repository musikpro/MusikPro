"use client";

import AdminActionForm from "@/components/admin/AdminActionForm";
import { useRef, useState } from "react";
import AdminCountryCombobox from "@/components/admin/AdminCountryCombobox";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import type { CountryReference } from "@/lib/languages/countries-reference";
import { PHONE_REFERENCE } from "@/lib/languages/phone-reference";
import { checkDialCode, checkDigits, checkExample, type FieldCheck } from "@/lib/languages/phone-validation";
import type { PhonePrefixActionState } from "@/app/admin/phone-prefixes/actions";

export type PhonePrefixFormValue = {
  id: string;
  countryCode: string;
  countryName: string;
  flag: string;
  dialCode: string;
  digits: number;
  placeholder: string;
  active: boolean;
  sortOrder: number;
};

/** Pastille de validation affichée devant la valeur du champ : verte (valide) ou rouge (à corriger). */
function ValidatedField({ check, id, children }: { check: FieldCheck; id: string; children: React.ReactNode }) {
  return (
    <>
      <div className={`admin-validated-field ${check.state === "empty" ? "" : `is-${check.state}`}`}>
        {check.state === "empty" ? null : (
          <span className="admin-validated-icon" aria-hidden="true">
            <Icon i={check.state === "valid" ? "check" : "x"} size={15} />
          </span>
        )}
        {children}
      </div>
      {check.state === "empty" ? null : (
        <small
          id={id}
          className={`admin-validated-message is-${check.state}`}
          role={check.state === "invalid" ? "alert" : "status"}
        >
          {check.message}
        </small>
      )}
    </>
  );
}

type AiState = { phase: "idle" | "loading" | "done" | "fallback" | "error"; message: string };

export default function AdminPhonePrefixForm({
  action,
  prefix,
  availableCountries = [],
}: {
  action: (previous: PhonePrefixActionState, formData: FormData) => Promise<PhonePrefixActionState>;
  prefix?: PhonePrefixFormValue;
  availableCountries?: CountryReference[];
}) {
  const editing = Boolean(prefix);
  // Création : aucun pays par défaut ; le choix d'un pays demande à l'IA (recherche web) l'indicatif, le nombre de
  // chiffres et un numéro exemple, puis les champs se valident en direct. Repli sur la référence interne si l'IA est
  // indisponible. Édition : valeurs enregistrées, sans pré-remplissage.
  const [country, setCountry] = useState<CountryReference | null>(null);
  const [countryTouched, setCountryTouched] = useState(false);
  const [dialCode, setDialCode] = useState(prefix?.dialCode ?? "");
  const [digits, setDigits] = useState(String(prefix?.digits ?? ""));
  const [example, setExample] = useState(prefix?.placeholder ?? "");
  const [ai, setAi] = useState<AiState>({ phase: "idle", message: "" });
  const requestId = useRef(0);

  async function detect(target: CountryReference) {
    const current = ++requestId.current;
    setAi({ phase: "loading", message: "L’IA recherche l’indicatif, le nombre de chiffres et un numéro exemple…" });
    try {
      const response = await fetch("/api/admin/ai/phone-prefix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode: target.code, countryName: target.name }),
      });
      const data: { dialCode?: string; digits?: number; example?: string; error?: string; webSearch?: string } =
        await response.json().catch(() => ({}));
      if (current !== requestId.current) return;
      if (!response.ok || !data.dialCode || !data.digits || !data.example)
        throw new Error(data.error || "IA indisponible.");
      setDialCode(data.dialCode);
      setDigits(String(data.digits));
      setExample(data.example);
      setAi({
        phase: "done",
        message:
          data.webSearch === "used"
            ? `Valeurs trouvées par l’IA après une recherche sur Internet pour ${target.name} : vérifie-les, tu peux les modifier.`
            : `Valeurs proposées par l’IA pour ${target.name} : vérifie-les, tu peux les modifier.`,
      });
    } catch (error) {
      if (current !== requestId.current) return;
      const reference = PHONE_REFERENCE[target.code];
      const reason = error instanceof Error ? error.message : "IA indisponible.";
      if (reference) {
        setDialCode(reference.dialCode);
        setDigits(String(reference.digits));
        setExample(reference.example);
        setAi({
          phase: "fallback",
          message: `${reason} Valeurs de la référence interne appliquées pour ${target.name} : vérifie-les.`,
        });
      } else {
        setAi({ phase: "error", message: `${reason} Renseigne les champs à la main.` });
      }
    }
  }

  const countryCheck: FieldCheck = country
    ? { state: "valid", message: `${country.name} sélectionné.` }
    : countryTouched
      ? { state: "invalid", message: "Choisis un pays dans la liste." }
      : { state: "empty", message: "" };
  const dialCheck = checkDialCode(dialCode);
  const digitsCheck = checkDigits(digits);
  const exampleCheck = checkExample(example, digits);
  const loading = ai.phase === "loading";

  return (
    <AdminActionForm action={action} className="admin-editor-grid">
      {editing ? (
        <>
          <input type="hidden" name="id" value={prefix!.id} />
          <div className="admin-editor-field is-wide">
            <span>Pays</span>
            <p>
              {prefix!.flag} {prefix!.countryName} ({prefix!.countryCode})
            </p>
          </div>
        </>
      ) : (
        <div className="admin-editor-field is-wide">
          <div className="admin-field-label-row">
            <span id="phone-prefix-country-label">Pays</span>
            <button
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              disabled={!country || loading}
              onClick={() => country && void detect(country)}
            >
              <Icon i="bot" size={13} />
              {loading ? "Recherche…" : "Régénérer avec l’IA"}
            </button>
          </div>
          <ValidatedField check={countryCheck} id="phone-prefix-country-msg">
            <AdminCountryCombobox
              name="countryCode"
              ariaLabel="Pays"
              options={availableCountries}
              onSelect={(selected) => {
                setCountry(selected);
                setCountryTouched(true);
                void detect(selected);
              }}
              onTouched={() => setCountryTouched(true)}
            />
          </ValidatedField>
          {ai.phase !== "idle" ? (
            <small
              role={ai.phase === "error" ? "alert" : "status"}
              className={`admin-validated-message ${ai.phase === "error" ? "is-invalid" : ai.phase === "fallback" ? "is-warning" : ""}`}
            >
              {ai.message}
            </small>
          ) : null}
        </div>
      )}
      <div className="admin-editor-field">
        <span id="phone-prefix-dial-label">Indicatif</span>
        <ValidatedField check={dialCheck} id="phone-prefix-dial-msg">
          <input
            id="phone-prefix-dial"
            aria-labelledby="phone-prefix-dial-label"
            name="dialCode"
            required
            placeholder="+225"
            value={dialCode}
            disabled={loading}
            aria-invalid={dialCheck.state === "invalid"}
            aria-describedby={dialCheck.state === "empty" ? undefined : "phone-prefix-dial-msg"}
            onChange={(event) => setDialCode(event.target.value)}
          />
        </ValidatedField>
      </div>
      <div className="admin-editor-field">
        <span id="phone-prefix-digits-label">Chiffres attendus</span>
        <ValidatedField check={digitsCheck} id="phone-prefix-digits-msg">
          <input
            id="phone-prefix-digits"
            aria-labelledby="phone-prefix-digits-label"
            name="digits"
            required
            type="number"
            min="6"
            max="12"
            placeholder="10"
            value={digits}
            disabled={loading}
            aria-invalid={digitsCheck.state === "invalid"}
            aria-describedby={digitsCheck.state === "empty" ? undefined : "phone-prefix-digits-msg"}
            onChange={(event) => setDigits(event.target.value)}
          />
        </ValidatedField>
      </div>
      <div className="admin-editor-field is-wide">
        <span id="phone-prefix-example-label">Exemple de numéro</span>
        <ValidatedField check={exampleCheck} id="phone-prefix-example-msg">
          <input
            id="phone-prefix-example"
            aria-labelledby="phone-prefix-example-label"
            name="placeholder"
            required
            placeholder="0708807015"
            value={example}
            disabled={loading}
            aria-invalid={exampleCheck.state === "invalid"}
            aria-describedby={exampleCheck.state === "empty" ? undefined : "phone-prefix-example-msg"}
            onChange={(event) => setExample(event.target.value)}
          />
        </ValidatedField>
      </div>
      <label className="admin-editor-field">
        <span>Position d’affichage</span>
        <input name="sortOrder" required type="number" min="0" max="999" defaultValue={prefix?.sortOrder ?? 100} />
      </label>
      <div className="admin-editor-field">
        <span>État</span>
        <AdminSelect
          name="active"
          defaultValue={String(prefix?.active ?? true)}
          ariaLabel="État du préfixe"
          options={[
            { value: "true", label: "Actif — visible pour les clients" },
            { value: "false", label: "Désactivé — masqué pour les clients" },
          ]}
        />
      </div>
      <div className="admin-editor-actions is-wide">
        <AdminBackLink href="/admin/phone-prefixes" label="Annuler" />
        <button type="submit" disabled={loading}>
          <Icon i={editing ? "save" : "plus"} size={17} />
          {editing ? "Enregistrer les modifications" : "Créer le préfixe"}
        </button>
      </div>
    </AdminActionForm>
  );
}
