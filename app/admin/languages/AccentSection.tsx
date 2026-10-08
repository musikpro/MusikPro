import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import Icon from "@/components/banani/Icon";
import AdminAccentHintField from "@/components/admin/AdminAccentHintField";
import type { languageAccents, languages } from "@/db/schema";
import { deleteLanguageAccent, saveLanguageAccent, toggleLanguageAccent } from "./accents-actions";

type Accent = typeof languageAccents.$inferSelect;
type Language = typeof languages.$inferSelect;
type StyleOption = { id: string; name: string };

function AccentFields({
  accent,
  languages: languageRows,
  styles,
  linkedStyleIds,
  languageNames,
}: {
  accent?: Accent;
  languages: Language[];
  styles: StyleOption[];
  linkedStyleIds: Set<string>;
  languageNames: Record<string, string>;
}) {
  const key = accent?.id ?? "new";
  return (
    <>
      {accent ? <input type="hidden" name="id" value={accent.id} /> : null}
      <label className="admin-editor-field">
        <span>Nom de l’accent (visible ici seulement)</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={60}
          defaultValue={accent?.name}
          placeholder="Ex. Français ivoirien"
        />
      </label>
      <div className="admin-editor-field">
        <span>Langue des paroles</span>
        <AdminSelect
          name="languageCode"
          ariaLabel="Langue des paroles"
          defaultValue={
            accent?.languageCode ?? (languageRows.find((language) => language.code === "fr") ?? languageRows[0])?.code
          }
          options={languageRows.map((language) => ({
            value: language.code,
            label: `${language.flag} ${language.name}`,
          }))}
        />
      </div>
      <label className="admin-editor-field">
        <span>Pays de l’accent (en français)</span>
        <input
          name="country"
          minLength={2}
          maxLength={80}
          defaultValue={accent?.country}
          placeholder="Ex. Côte d’Ivoire"
        />
      </label>
      <AdminAccentHintField key={`${key}-hint`} defaultValue={accent?.aiHint} languageNames={languageNames} />
      <fieldset className="admin-editor-field is-wide">
        <legend>Styles musicaux qui utilisent cet accent</legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
          {styles.map((style) => (
            <label className="admin-check-control" key={`${key}-${style.id}`}>
              <input
                type="checkbox"
                name="styleIds"
                value={style.id}
                data-style-name={style.name}
                defaultChecked={linkedStyleIds.has(style.id)}
              />
              <span>{style.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="admin-editor-field">
        <span>État</span>
        <AdminSelect
          name="active"
          ariaLabel="État de l’accent"
          defaultValue={accent && !accent.active ? "false" : "true"}
          options={[
            { value: "true", label: "Actif" },
            { value: "false", label: "Inactif" },
          ]}
        />
      </div>
      <label className="admin-editor-field">
        <span>Ordre</span>
        <input name="sortOrder" type="number" min={0} max={999} defaultValue={accent?.sortOrder ?? 100} />
      </label>
    </>
  );
}

/**
 * Variantes d'accent des langues de paroles (français ivoirien, anglais ghanéen…). Réglage technique du propriétaire :
 * la consigne part en anglais vers Musicful selon le style choisi, le client n'en voit rien.
 */
export default function AccentSection({
  accents,
  languages: languageRows,
  styles,
  links,
}: {
  accents: Accent[];
  languages: Language[];
  styles: StyleOption[];
  links: Array<{ styleId: string; accentId: string }>;
}) {
  const lyricsLanguages = languageRows.filter((language) => language.lyricsEnabled);
  const languageNames = Object.fromEntries(languageRows.map((language) => [language.code, language.name]));
  const styleIdsByAccent = new Map<string, Set<string>>();
  for (const link of links) {
    if (!styleIdsByAccent.has(link.accentId)) styleIdsByAccent.set(link.accentId, new Set());
    styleIdsByAccent.get(link.accentId)?.add(link.styleId);
  }
  const languageName = new Map(languageRows.map((language) => [language.code, language]));
  const ordered = [...accents].sort(
    (left, right) =>
      left.languageCode.localeCompare(right.languageCode) ||
      left.sortOrder - right.sortOrder ||
      left.name.localeCompare(right.name, "fr"),
  );
  return (
    <section className="admin-panel admin-language-section">
      <div className="admin-section-heading">
        <div>
          <h2>Accents vocaux</h2>
          <p>
            Précise l’origine de la langue chantée (par exemple français ivoirien, anglais ghanéen). Indique le pays en
            français, coche les styles concernés puis clique sur « Générer avec l’IA » : l’IA cherche sur Internet et
            rédige la consigne en anglais. Cette consigne, prioritaire, est ajoutée à la demande envoyée à l’IA musicale
            quand le client choisit un des styles cochés avec cette langue. Pour toutes les chansons, quel que soit le
            style, « éviter les accents européens ou occidentaux » est ajouté automatiquement. Le client ne voit jamais
            ces accents. Un style a au plus un accent par langue.
          </p>
        </div>
        <span className="admin-status is-success">
          {accents.filter((accent) => accent.active).length} actif
          {accents.filter((accent) => accent.active).length > 1 ? "s" : ""}
        </span>
      </div>
      {ordered.length ? (
        <div className="admin-catalog-grid">
          {ordered.map((accent) => {
            const formId = `accent-edit-${accent.id}`;
            const language = languageName.get(accent.languageCode);
            return (
              <article className={`admin-catalog-card ${accent.active ? "is-active" : ""}`} key={accent.id}>
                <div className="admin-catalog-card-head">
                  <span className="admin-catalog-icon">{language?.flag ?? "🌍"}</span>
                  <span className={`admin-status ${accent.active ? "is-success" : "is-pending"}`}>
                    {accent.active ? "Actif" : "Inactif"}
                  </span>
                </div>
                <h3>{accent.name}</h3>
                {accent.country ? <p className="admin-muted">{accent.country}</p> : null}
                <AdminActionForm id={formId} action={saveLanguageAccent} className="admin-editor-grid">
                  <AccentFields
                    accent={accent}
                    languages={languageRows}
                    styles={styles}
                    linkedStyleIds={styleIdsByAccent.get(accent.id) ?? new Set()}
                    languageNames={languageNames}
                  />
                </AdminActionForm>
                <footer className="admin-style-actions">
                  <button type="submit" form={formId} className="admin-secondary-action">
                    <Icon i="save" size={15} /> Enregistrer
                  </button>
                  <AdminActionForm action={toggleLanguageAccent}>
                    <input type="hidden" name="id" value={accent.id} />
                    <button className="admin-secondary-action" type="submit">
                      <Icon i={accent.active ? "pause" : "play"} size={15} /> {accent.active ? "Désactiver" : "Activer"}
                    </button>
                  </AdminActionForm>
                  <AdminActionForm action={deleteLanguageAccent}>
                    <input type="hidden" name="id" value={accent.id} />
                    <button className="admin-secondary-action is-danger" type="submit">
                      <Icon i="trash-2" size={15} /> Supprimer
                    </button>
                  </AdminActionForm>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-empty-state">
          <strong>Aucun accent défini</strong>
          <p>Sans accent, la langue chantée reste générique (« sung in French »).</p>
        </div>
      )}
      {lyricsLanguages.length > 0 ? (
        <AdminActionForm action={saveLanguageAccent} className="admin-editor-grid">
          <div className="admin-editor-field is-wide">
            <h3>Ajouter un accent</h3>
          </div>
          <AccentFields
            languages={lyricsLanguages}
            styles={styles}
            linkedStyleIds={new Set()}
            languageNames={languageNames}
          />
          <div className="admin-editor-actions is-wide">
            <button type="submit">
              <Icon i="plus" size={16} /> Ajouter l’accent
            </button>
          </div>
        </AdminActionForm>
      ) : null}
    </section>
  );
}
