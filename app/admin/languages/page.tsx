import { asc } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import RefreshCatalogTranslationsButton from "@/components/admin/RefreshCatalogTranslationsButton";
import { getServiceDb } from "@/db";
import { languages, localizationSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { deleteLanguage, toggleLanguageScope, updateAutomaticLanguageDetection } from "./actions";

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
                <form action={toggleLanguageScope}>
                  <input type="hidden" name="id" value={language.id} />
                  <input type="hidden" name="scope" value={scope} />
                  <button className="admin-secondary-action" type="submit">
                    <Icon i={isEnabled(language) ? "pause" : "play"} size={15} />{" "}
                    {isEnabled(language) ? "Désactiver" : "Activer"}
                  </button>
                </form>
                <form action={deleteLanguage}>
                  <input type="hidden" name="id" value={language.id} />
                  <button className="admin-secondary-action is-danger" type="submit">
                    <Icon i="trash-2" size={15} /> Supprimer
                  </button>
                </form>
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

export default async function AdminLanguagesPage() {
  await requireAdmin();
  const serviceDb = getServiceDb();
  const [rows, settingsRows] = await Promise.all([
    serviceDb.select().from(languages).orderBy(asc(languages.name)),
    serviceDb.select().from(localizationSettings).limit(1),
  ]);
  const automaticDetectionEnabled = settingsRows[0]?.automaticDetectionEnabled ?? true;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Localisation"
        title="Langues"
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
      <div className="admin-language-top-row">
        <section className="admin-panel admin-language-detection">
          <div className="admin-section-heading">
            <div>
              <h2>Détection automatique du pays</h2>
              <p>
                Country.is détecte le pays côté serveur. Le résultat est conservé 7 jours dans le cache Upstash et le
                choix manuel du client reste prioritaire.
              </p>
            </div>
            <span className={`admin-status ${automaticDetectionEnabled ? "is-success" : "is-pending"}`}>
              {automaticDetectionEnabled ? "Activée" : "Désactivée"}
            </span>
          </div>
          <form action={updateAutomaticLanguageDetection}>
            <input type="hidden" name="enabled" value={String(!automaticDetectionEnabled)} />
            <button className="admin-secondary-action" type="submit">
              <Icon i={automaticDetectionEnabled ? "pause" : "play"} size={16} />
              {automaticDetectionEnabled ? "Désactiver la détection" : "Activer la détection"}
            </button>
          </form>
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
      <LanguageSection
        title="Langues de l’interface"
        description="Langues proposées pour naviguer dans MusikPro. Les traductions éditoriales restent relues à partir du français de référence."
        rows={rows}
        scope="interface"
      />
      <LanguageSection
        title="Langues des paroles"
        description="Langues transmises au fournisseur IA pour générer les paroles de chanson."
        rows={rows}
        scope="lyrics"
      />
    </AdminPage>
  );
}
