import { asc } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import AdminActionForm from "@/components/admin/AdminActionForm";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import AdminSelect from "@/components/admin/AdminSelect";
import Icon from "@/components/banani/Icon";
import RefreshCatalogTranslationsButton from "@/components/admin/RefreshCatalogTranslationsButton";
import { getServiceDb } from "@/db";
import { countryLanguages, languages } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { creditCurrencies } from "@/lib/credit-plans/currency";
import { COUNTRIES_REFERENCE } from "@/lib/languages/countries-reference";
import { deleteLanguage, removeCountryLanguage, setCountryLanguage, toggleLanguageScope } from "./actions";

function LanguageSection({
  title,
  description,
  rows,
  scope,
}: {
  title: string;
  description: string;
  rows: Array<typeof languages.$inferSelect>;
  scope: "interface" | "lyrics";
}) {
  const isEnabled = (language: typeof languages.$inferSelect) =>
    scope === "interface" ? language.interfaceEnabled : language.lyricsEnabled;
  const orderedRows = [...rows].sort((left, right) => {
    const leftOrder = scope === "interface" ? left.interfaceOrder : left.lyricsOrder;
    const rightOrder = scope === "interface" ? right.interfaceOrder : right.lyricsOrder;
    return leftOrder - rightOrder || left.name.localeCompare(right.name, "fr");
  });
  const activeCount = rows.filter(isEnabled).length;
  return (
    <section className="admin-panel admin-language-section">
      <div className="admin-section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="admin-status is-success">
          {activeCount} active{activeCount > 1 ? "s" : ""}
        </span>
      </div>
      {orderedRows.length ? (
        <div className="admin-catalog-grid">
          {orderedRows.map((language) => (
            <article
              className={`admin-catalog-card ${isEnabled(language) ? "is-active" : ""}`}
              key={`${scope}-${language.id}`}
            >
              <div className="admin-catalog-card-head">
                <span className="admin-catalog-icon">{language.flag}</span>
                <span className={`admin-status ${isEnabled(language) ? "is-success" : "is-pending"}`}>
                  {isEnabled(language) ? "Actif" : "Inactif"}
                </span>
              </div>
              <h3>{language.name}</h3>
              <p>
                {language.nativeName} · {language.code.toUpperCase()}
              </p>
              <footer className="admin-style-actions">
                <Link className="admin-secondary-action admin-style-edit" href={`/admin/languages/${language.id}`}>
                  <Icon i="pencil" size={15} /> Modifier
                </Link>
                <AdminActionForm action={toggleLanguageScope}>
                  <input type="hidden" name="id" value={language.id} />
                  <input type="hidden" name="scope" value={scope} />
                  <button className="admin-secondary-action" type="submit">
                    <Icon i={isEnabled(language) ? "pause" : "play"} size={15} />{" "}
                    {isEnabled(language) ? "Désactiver" : "Activer"}
                  </button>
                </AdminActionForm>
                <AdminActionForm action={deleteLanguage}>
                  <input type="hidden" name="id" value={language.id} />
                  <button className="admin-secondary-action is-danger" type="submit">
                    <Icon i="trash-2" size={15} /> Supprimer
                  </button>
                </AdminActionForm>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty-state">
          <strong>Aucune langue active</strong>
          <p>Ajoute ou active une langue pour ce catalogue.</p>
        </div>
      )}
    </section>
  );
}

function CountryLanguageSection({
  mappedCountries,
  availableCountries,
  interfaceLanguages,
}: {
  mappedCountries: Array<typeof countryLanguages.$inferSelect>;
  availableCountries: Array<{ code: string; name: string; flag: string }>;
  interfaceLanguages: Array<typeof languages.$inferSelect>;
}) {
  const orderedCountries = [...mappedCountries].sort((left, right) =>
    left.countryName.localeCompare(right.countryName, "fr"),
  );
  return (
    <section className="admin-panel admin-language-section">
      <div className="admin-section-heading">
        <div>
          <h2>Association pays, langue et monnaie</h2>
          <p>
            Quand country.is détecte le pays d’un visiteur, MusikPro utilise cette table pour choisir automatiquement la
            langue de l’interface et la devise affichée sur l’écran crédits. Liste initiale : pays où Chariow propose au
            moins deux moyens de paiement. Ajoute d’autres pays si besoin.
          </p>
        </div>
        <span className="admin-status is-success">
          {orderedCountries.length} pays{orderedCountries.length > 1 ? "" : ""}
        </span>
      </div>
      {orderedCountries.length ? (
        <div className="admin-catalog-grid">
          {orderedCountries.map((row) => {
            const editFormId = `country-language-edit-${row.countryCode}`;
            return (
              <article className="admin-catalog-card is-active" key={row.countryCode}>
                <div className="admin-catalog-card-head">
                  <span className="admin-catalog-icon">{row.flag}</span>
                  <span className="admin-status is-success">{row.languageCode.toUpperCase()}</span>
                </div>
                <h3>{row.countryName}</h3>
                <p>{row.countryCode}</p>
                <p className="admin-country-currency">{row.currencyCode}</p>
                {interfaceLanguages.length > 0 ? (
                  <AdminActionForm id={editFormId} action={setCountryLanguage} className="admin-editor-grid">
                    <input type="hidden" name="countryCode" value={row.countryCode} />
                    <div className="admin-editor-field">
                      <span>Langue</span>
                      <AdminSelect
                        name="languageCode"
                        ariaLabel={`Langue pour ${row.countryName}`}
                        defaultValue={row.languageCode}
                        options={interfaceLanguages.map((language) => ({
                          value: language.code,
                          label: `${language.flag} ${language.name}`,
                        }))}
                      />
                    </div>
                    <div className="admin-editor-field">
                      <span>Monnaie</span>
                      <AdminSelect
                        name="currencyCode"
                        ariaLabel={`Monnaie pour ${row.countryName}`}
                        defaultValue={row.currencyCode}
                        options={creditCurrencies.map((currency) => ({ value: currency.code, label: currency.label }))}
                      />
                    </div>
                  </AdminActionForm>
                ) : null}
                <footer className="admin-style-actions">
                  {interfaceLanguages.length > 0 ? (
                    <button type="submit" form={editFormId} className="admin-secondary-action">
                      <Icon i="save" size={15} /> Enregistrer
                    </button>
                  ) : null}
                  <AdminActionForm action={removeCountryLanguage}>
                    <input type="hidden" name="countryCode" value={row.countryCode} />
                    <button className="admin-secondary-action is-danger" type="submit">
                      <Icon i="trash-2" size={15} /> Retirer
                    </button>
                  </AdminActionForm>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-empty-state">
          <strong>Aucun pays associé</strong>
          <p>Ajoute un pays ci-dessous pour lui associer une langue.</p>
        </div>
      )}
      {availableCountries.length > 0 && interfaceLanguages.length > 0 ? (
        <AdminActionForm action={setCountryLanguage} className="admin-editor-grid">
          <div className="admin-editor-field">
            <span>Pays</span>
            <AdminSelect
              name="countryCode"
              ariaLabel="Pays à ajouter"
              defaultValue={availableCountries[0]?.code}
              options={availableCountries.map((country) => ({
                value: country.code,
                label: `${country.flag} ${country.name}`,
              }))}
            />
          </div>
          <div className="admin-editor-field">
            <span>Langue associée</span>
            <AdminSelect
              name="languageCode"
              ariaLabel="Langue associée"
              defaultValue={interfaceLanguages[0]?.code}
              options={interfaceLanguages.map((language) => ({
                value: language.code,
                label: `${language.flag} ${language.name}`,
              }))}
            />
          </div>
          <div className="admin-editor-field">
            <span>Monnaie</span>
            <AdminSelect
              name="currencyCode"
              ariaLabel="Monnaie associée"
              defaultValue={creditCurrencies[0]?.code}
              options={creditCurrencies.map((currency) => ({ value: currency.code, label: currency.label }))}
            />
          </div>
          <div className="admin-editor-actions">
            <button type="submit">
              <Icon i="plus" size={16} /> Associer
            </button>
          </div>
        </AdminActionForm>
      ) : null}
    </section>
  );
}

export default async function AdminLanguagesPage() {
  await requireAdmin();
  const serviceDb = getServiceDb();
  const [rows, countryLanguageRows] = await Promise.all([
    serviceDb.select().from(languages).orderBy(asc(languages.name)),
    serviceDb.select().from(countryLanguages),
  ]);
  const mappedCodes = new Set(countryLanguageRows.map((row) => row.countryCode));
  const availableCountries = COUNTRIES_REFERENCE.filter((country) => !mappedCodes.has(country.code));
  const interfaceLanguages = rows.filter((language) => language.interfaceEnabled);
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Localisation"
        title="Langues et Monnaies"
        description="Gère séparément les langues de l’interface et celles utilisées pour écrire les paroles."
        action={{ href: "/admin/languages/new", label: "Nouvelle langue" }}
      />
      <div className="admin-source-notice is-connected">
        <Icon i="database-zap" size={18} />
        <div>
          <strong>Catalogue connecté à Neon</strong>
          <p>Toute modification est répercutée dans les sélecteurs du tableau de bord client.</p>
        </div>
      </div>
      <AdminTabs
        ariaLabel="Sections de Langues et Monnaies"
        tabs={[
          { id: "interface", label: "Langues de l’interface" },
          { id: "lyrics", label: "Langues des paroles" },
          { id: "countries", label: "Association pays, langue et monnaie" },
          { id: "settings", label: "Réglages" },
        ]}
      >
        <AdminTabPanel id="interface">
          <LanguageSection
            title="Langues de l’interface"
            description="Langues proposées pour naviguer dans MusikPro. Les traductions éditoriales restent relues à partir du français de référence."
            rows={rows}
            scope="interface"
          />
        </AdminTabPanel>
        <AdminTabPanel id="lyrics">
          <LanguageSection
            title="Langues des paroles"
            description="Langues transmises au fournisseur IA pour générer les paroles de chanson."
            rows={rows}
            scope="lyrics"
          />
        </AdminTabPanel>
        <AdminTabPanel id="countries">
          <CountryLanguageSection
            mappedCountries={countryLanguageRows}
            availableCountries={availableCountries}
            interfaceLanguages={interfaceLanguages}
          />
        </AdminTabPanel>
        <AdminTabPanel id="settings">
          <div className="admin-language-top-row">
            <section className="admin-panel admin-language-detection">
              <div className="admin-section-heading">
                <div>
                  <h2>Détection automatique du pays</h2>
                  <p>
                    Activation, durée du cache, pays de secours et diagnostic Country.is se règlent désormais dans une
                    boîte dédiée des paramètres généraux.
                  </p>
                </div>
              </div>
              <Link className="admin-secondary-action" href="/admin/settings">
                <Icon i="settings" size={16} />
                Ouvrir les réglages de détection
              </Link>
            </section>
            <section className="admin-panel admin-language-detection">
              <div className="admin-section-heading">
                <div>
                  <h2>Traductions du catalogue</h2>
                  <p>
                    Traduit avec l’IA connectée les occasions, styles musicaux, relations et offres de crédits dans
                    toutes les langues actives, pour que le parcours de création et les crédits s’affichent dans la
                    langue choisie par le client. Le contenu source en français n’est jamais modifié.
                  </p>
                </div>
              </div>
              <RefreshCatalogTranslationsButton />
            </section>
          </div>
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}
