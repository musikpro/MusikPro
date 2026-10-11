"use client";

import { useState } from "react";
import { suggestLyricsGuidance } from "@/app/admin/lyrics-guidance/actions";
import Icon from "@/components/banani/Icon";
import { LYRICS_GUIDANCE_MAX_LENGTH } from "@/lib/ai/lyrics-guidance";
import { STYLE_AI_DESCRIPTION_MAX_LENGTH } from "@/lib/ai/style-prompt-builder";

type Kind = "client" | "ai" | "lyrics";

export default function AdminMusicStyleDescriptionFields({
  defaultClientDescription = "",
  defaultAiDescription = "",
  defaultLyricsGuidance = "",
}: {
  defaultClientDescription?: string;
  defaultAiDescription?: string;
  defaultLyricsGuidance?: string;
}) {
  const [clientDescription, setClientDescription] = useState(defaultClientDescription);
  const [aiDescription, setAiDescription] = useState(defaultAiDescription);
  const [lyricsGuidance, setLyricsGuidance] = useState(defaultLyricsGuidance);
  const [pending, setPending] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchNote, setSearchNote] = useState<string | null>(null);

  // La génération IA n'affiche volontairement pas de notification toast — seul le bouton
  // « Enregistrer les modifications » doit en déclencher une. Une erreur reste visible
  // localement sous les champs, sans notification globale.
  async function generate(kind: Kind, form: HTMLFormElement | null) {
    const nameField = form?.elements.namedItem("name");
    const styleName = (nameField instanceof HTMLInputElement ? nameField.value : "").trim();
    if (styleName.length < 2) {
      setError("Renseigne d’abord le nom du style avant de générer une description.");
      return;
    }
    setPending(kind);
    setError(null);
    setSearchNote(null);
    try {
      if (kind === "lyrics") {
        const result = await suggestLyricsGuidance({ kind: "style", name: styleName, description: clientDescription });
        if (!result.ok) throw new Error(result.message);
        setLyricsGuidance(result.text);
        return;
      }
      const response = await fetch("/api/admin/ai/music-style-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleName,
          kind,
          otherDescription: (kind === "client" ? aiDescription : clientDescription) || undefined,
        }),
      });
      const data: { text?: string; error?: string; webSearch?: "used" | "unavailable" | "off" } = await response
        .json()
        .catch(() => ({}));
      if (!response.ok || !data.text) throw new Error(data.error || "La génération a échoué.");
      if (kind === "client") setClientDescription(data.text);
      else {
        setAiDescription(data.text);
        setSearchNote(
          data.webSearch === "used"
            ? "Consigne rédigée après une recherche sur Internet sur ce style."
            : data.webSearch === "unavailable"
              ? "La recherche Internet n’est pas disponible avec ce fournisseur IA : consigne rédigée sans recherche."
              : null,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "La génération a échoué.");
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <div className="admin-editor-field admin-style-client-field">
        <div className="admin-field-label-row">
          <span>Description client</span>
          <button
            type="button"
            className="admin-btn admin-btn-secondary admin-btn-sm"
            onClick={(event) => generate("client", event.currentTarget.form)}
            disabled={pending !== null}
          >
            <Icon i="bot" size={13} />
            {pending === "client" ? "Génération…" : clientDescription.trim() ? "Régénérer" : "Générer avec l’IA"}
          </button>
        </div>
        <textarea
          name="description"
          required
          minLength={5}
          maxLength={240}
          rows={4}
          value={clientDescription}
          onChange={(event) => setClientDescription(event.target.value)}
          placeholder="Décris le rythme et l’ambiance proposés au client"
        />
      </div>
      <div className="admin-editor-field admin-style-ai-field">
        <div className="admin-field-label-row">
          <span>Consigne pour l’IA musicale (anglais)</span>
          <button
            type="button"
            className="admin-btn admin-btn-secondary admin-btn-sm"
            onClick={(event) => generate("ai", event.currentTarget.form)}
            disabled={pending !== null}
          >
            <Icon i="bot" size={13} />
            {pending === "ai"
              ? "Recherche et génération…"
              : aiDescription.trim()
                ? "Régénérer"
                : "Suggérer la consigne"}
          </button>
        </div>
        <textarea
          name="aiDescription"
          maxLength={STYLE_AI_DESCRIPTION_MAX_LENGTH}
          rows={9}
          value={aiDescription}
          onChange={(event) => setAiDescription(event.target.value)}
          aria-describedby="music-style-ai-hint"
          placeholder="Modern Nigerian Afrobeats / Naija Pop, 100-120 BPM, syncopated African grooves, punchy deep bass… (en anglais)"
        />
        <small id="music-style-ai-hint">
          Seule cette consigne en anglais (précédée du nom du style) est envoyée à Musicful ; la description client
          n’est jamais transmise. {aiDescription.length}/{STYLE_AI_DESCRIPTION_MAX_LENGTH} caractères
        </small>
      </div>
      <div className="admin-editor-field admin-style-lyrics-field">
        <div className="admin-field-label-row">
          <span>Consigne pour l’IA des paroles (français, facultative)</span>
          <button
            type="button"
            className="admin-btn admin-btn-secondary admin-btn-sm"
            onClick={(event) => generate("lyrics", event.currentTarget.form)}
            disabled={pending !== null}
          >
            <Icon i="bot" size={13} />
            {pending === "lyrics" ? "Génération…" : lyricsGuidance.trim() ? "Régénérer" : "Suggérer la consigne"}
          </button>
        </div>
        <textarea
          name="lyricsGuidance"
          maxLength={LYRICS_GUIDANCE_MAX_LENGTH}
          rows={4}
          value={lyricsGuidance}
          onChange={(event) => setLyricsGuidance(event.target.value)}
          aria-describedby="music-style-lyrics-hint"
          placeholder="Ex. Phrases courtes et percutantes, rimes internes, vocabulaire de rue, expressions en nouchi, refrain scandé et facile à reprendre…"
        />
        <small id="music-style-lyrics-hint">
          Cette consigne guide l’écriture des paroles (flow, métrique, vocabulaire, structure adaptés à ce style). Elle
          est envoyée à l’IA des paroles, jamais à Musicful ni au client. Vide : aucune consigne de style.{" "}
          {lyricsGuidance.length}/{LYRICS_GUIDANCE_MAX_LENGTH} caractères
        </small>
      </div>
      {searchNote ? (
        <p className="admin-editor-field is-wide" role="status">
          {searchNote}
        </p>
      ) : null}
      {error ? <p className="admin-field-error admin-editor-field is-wide">{error}</p> : null}
    </>
  );
}
