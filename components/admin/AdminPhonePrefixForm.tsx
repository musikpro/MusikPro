"use client";

import AdminActionForm from "@/components/admin/AdminActionForm";
import { useState } from "react";
import AdminCountryCombobox from "@/components/admin/AdminCountryCombobox";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import type { CountryReference } from "@/lib/languages/countries-reference";
import { PHONE_REFERENCE } from "@/lib/languages/phone-reference";
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
  // Création : aucun pays par défaut ; le choix d'un pays pré-remplit l'indicatif, le nombre de chiffres et l'exemple
  // (valeurs de référence, modifiables). Édition : valeurs enregistrées, sans pré-remplissage.
  const [dialCode, setDialCode] = useState(prefix?.dialCode ?? "");
  const [digits, setDigits] = useState(String(prefix?.digits ?? ""));
  const [example, setExample] = useState(prefix?.placeholder ?? "");
  const [autoFilled, setAutoFilled] = useState<string | null>(null);
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
          <span id="phone-prefix-country-label">Pays</span>
          <AdminCountryCombobox
            name="countryCode"
            ariaLabel="Pays"
            options={availableCountries}
            onSelect={(country) => {
              const reference = PHONE_REFERENCE[country.code];
              if (!reference) {
                setAutoFilled(null);
                return;
              }
              setDialCode(reference.dialCode);
              setDigits(String(reference.digits));
              setExample(reference.example);
              setAutoFilled(country.name);
            }}
          />
          {autoFilled ? (
            <small role="status">
              Indicatif, nombre de chiffres et exemple remplis automatiquement pour {autoFilled} : vérifie-les, tu peux
              les modifier.
            </small>
          ) : null}
        </div>
      )}
      <label className="admin-editor-field">
        <span>Indicatif</span>
        <input
          name="dialCode"
          required
          placeholder="+225"
          value={dialCode}
          onChange={(event) => setDialCode(event.target.value)}
        />
      </label>
      <label className="admin-editor-field">
        <span>Chiffres attendus</span>
        <input
          name="digits"
          required
          type="number"
          min="6"
          max="12"
          placeholder="10"
          value={digits}
          onChange={(event) => setDigits(event.target.value)}
        />
      </label>
      <label className="admin-editor-field is-wide">
        <span>Exemple de numéro</span>
        <input
          name="placeholder"
          required
          placeholder="0708807015"
          value={example}
          onChange={(event) => setExample(event.target.value)}
        />
      </label>
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
        <button type="submit">
          <Icon i={editing ? "save" : "plus"} size={17} />
          {editing ? "Enregistrer les modifications" : "Créer le préfixe"}
        </button>
      </div>
    </AdminActionForm>
  );
}
