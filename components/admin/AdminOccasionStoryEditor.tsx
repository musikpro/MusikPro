"use client";

import { useState, useTransition } from "react";
import AdminActionForm from "@/components/admin/AdminActionForm";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import Icon from "@/components/banani/Icon";
import { saveOccasionStoryCopy, suggestOccasionStoryCopy } from "@/app/admin/occasions/actions";
import { OCCASION_STORY_MAX_LENGTHS, type OccasionStoryCopy, type OccasionStoryField } from "@/lib/occasions/catalog";

const FIELDS: { key: OccasionStoryField; label: string; rows: number; placeholder: string }[] = [
  { key: "storyTitle", label: "Titre de la page", rows: 1, placeholder: "Ex. Parle-nous de cet anniversaire" },
  { key: "storySubtitle", label: "Sous-titre", rows: 2, placeholder: "Ex. Dis-nous qui on fête et pourquoi" },
  { key: "storyLabel", label: "Libellé du champ", rows: 1, placeholder: "Ex. Ton message d’anniversaire" },
  {
    key: "storyPlaceholder",
    label: "Texte d’exemple dans le champ (masque)",
    rows: 3,
    placeholder: "Ex. : Mon frère Moussa fête ses 25 ans...",
  },
  { key: "storyTip", label: "Astuce sous le champ", rows: 2, placeholder: "Cite l’âge, un souvenir drôle et un vœu." },
];

export type OccasionStoryRow = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  active: boolean;
} & OccasionStoryCopy;

function OccasionStoryCard({
  occasion,
  open,
  onToggle,
}: {
  occasion: OccasionStoryRow;
  open: boolean;
  onToggle: () => void;
}) {
  const [copy, setCopy] = useState<OccasionStoryCopy>({
    storyTitle: occasion.storyTitle,
    storySubtitle: occasion.storySubtitle,
    storyLabel: occasion.storyLabel,
    storyPlaceholder: occasion.storyPlaceholder,
    storyTip: occasion.storyTip,
  });
  const showToast = useAdminToast();
  const [suggesting, startSuggest] = useTransition();
  const [suggestingField, setSuggestingField] = useState<OccasionStoryField | null>(null);
  const empty = Object.values(copy).every((value) => !value.trim());

  /** Sans `only` : les 5 textes ; avec `only` : seul ce champ est remplacé, les autres saisies sont conservées. */
  const suggest = (only?: OccasionStoryField) => {
    setSuggestingField(only ?? null);
    startSuggest(async () => {
      const result = await suggestOccasionStoryCopy({ name: occasion.name, description: occasion.description });
      if (result.ok) {
        setCopy((previous) => (only ? { ...previous, [only]: result.copy[only] } : result.copy));
        showToast({ message: "Texte suggéré : relis-le puis enregistre.", tone: "success" });
      } else {
        showToast({ message: result.message, tone: "error" });
      }
    });
  };

  const bodyId = `occasion-story-${occasion.id}`;

  return (
    <article className={`admin-occasion-row ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="admin-occasion-row-head"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <span className="admin-occasion-row-emoji" aria-hidden="true">
          {occasion.emoji}
        </span>
        <span className="admin-occasion-row-name">{occasion.name}</span>
        {occasion.active ? null : <span className="admin-status">Désactivée</span>}
        <span className={`admin-status ${empty ? "" : "is-success"}`}>{empty ? "Texte générique" : "Personnalisée"}</span>
        <Icon i="chevron-down" size={18} className="admin-occasion-row-chevron" />
      </button>
      <div id={bodyId} className="admin-occasion-row-body" inert={!open}>
        <div className="admin-occasion-row-inner">
          <AdminActionForm action={saveOccasionStoryCopy} className="admin-editor-grid">
            <input type="hidden" name="id" value={occasion.id} />
            <small>
              {empty
                ? "Aucun texte personnalisé : le client voit le texte générique « Raconte ton histoire »."
                : "Ces textes remplacent le texte générique quand le client choisit cette occasion."}
            </small>
            {FIELDS.map(({ key, label, rows, placeholder }) => (
              <label key={key} className="admin-editor-field is-wide">
                <span>{label}</span>
                <textarea
                  name={key}
                  rows={rows}
                  maxLength={OCCASION_STORY_MAX_LENGTHS[key]}
                  value={copy[key]}
                  onChange={(event) => setCopy((previous) => ({ ...previous, [key]: event.target.value }))}
                  placeholder={placeholder}
                />
                <small>
                  {copy[key].length}/{OCCASION_STORY_MAX_LENGTHS[key]}
                </small>
                <button
                  type="button"
                  className="admin-secondary-action"
                  onClick={() => suggest(key)}
                  disabled={suggesting}
                >
                  <Icon i="bot" size={15} />
                  {suggesting && suggestingField === key ? "Suggestion…" : "Suggérer ce texte"}
                </button>
              </label>
            ))}
            <div className="admin-editor-actions is-wide">
              <button type="button" className="admin-secondary-action" onClick={() => suggest()} disabled={suggesting}>
                <Icon i="bot" size={15} />
                {suggesting && suggestingField === null ? "Génération…" : "Générer les 5 textes avec l’IA"}
              </button>
              <button type="submit">
                <Icon i="save" size={17} />
                Enregistrer
              </button>
            </div>
          </AdminActionForm>
        </div>
      </div>
    </article>
  );
}

/**
 * Liste d'occasions repliées par défaut ; un clic déplie les textes de la page « Raconte ton histoire » de cette
 * occasion (une seule ouverte à la fois). Les panneaux restent montés : les saisies d'une occasion repliée sont gardées.
 */
export default function AdminOccasionStoryEditor({ occasions }: { occasions: OccasionStoryRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="admin-occasion-list">
      {occasions.map((occasion) => (
        <OccasionStoryCard
          key={`${occasion.id}:${occasion.storyTitle}:${occasion.storyTip}`}
          occasion={occasion}
          open={openId === occasion.id}
          onToggle={() => setOpenId((current) => (current === occasion.id ? null : occasion.id))}
        />
      ))}
    </div>
  );
}
