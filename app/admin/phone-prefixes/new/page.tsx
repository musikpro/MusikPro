import AdminPhonePrefixForm from "@/components/admin/AdminPhonePrefixForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { phonePrefixes } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { COUNTRIES_REFERENCE } from "@/lib/languages/countries-reference";
import { createPhonePrefix } from "../actions";

export default async function AdminNewPhonePrefixPage() {
  await requireAdmin();
  const existing = await getServiceDb().select({ countryCode: phonePrefixes.countryCode }).from(phonePrefixes);
  const existingCodes = new Set(existing.map((row) => row.countryCode));
  const availableCountries = COUNTRIES_REFERENCE.filter((country) => !existingCodes.has(country.code));
  return (
    <AdminPage>
      <AdminBackLink href="/admin/phone-prefixes" />
      <AdminPageHeader
        eyebrow="Téléphonie"
        title="Nouveau préfixe"
        description="Ajoute un pays au sélecteur d’indicatif du parcours client."
      />
      {availableCountries.length ? (
        <AdminPhonePrefixForm action={createPhonePrefix} availableCountries={availableCountries} />
      ) : (
        <p>Tous les pays de la liste de référence ont déjà un préfixe enregistré.</p>
      )}
    </AdminPage>
  );
}
