"use client";

import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import type { CountryReference } from "@/lib/languages/countries-reference";
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
        <label className="admin-editor-field is-wide">
          <span>Pays</span>
          <AdminSelect
            name="countryCode"
            defaultValue={availableCountries[0]?.code ?? ""}
            ariaLabel="Pays"
            options={availableCountries.map((country) => ({
              value: country.code,
              label: `${country.flag} ${country.name}`,
            }))}
          />
        </label>
      )}
      <label className="admin-editor-field">
        <span>Indicatif</span>
        <input name="dialCode" required placeholder="+225" defaultValue={prefix?.dialCode} />
      </label>
      <label className="admin-editor-field">
        <span>Chiffres attendus</span>
        <input name="digits" required type="number" min="6" max="12" defaultValue={prefix?.digits ?? 8} />
      </label>
      <label className="admin-editor-field is-wide">
        <span>Exemple de numéro</span>
        <input name="placeholder" required placeholder="0708807015" defaultValue={prefix?.placeholder} />
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
