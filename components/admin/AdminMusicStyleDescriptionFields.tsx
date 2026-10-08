"use client";

import { useState } from "react";
import Icon from "@/components/banani/Icon";
import { STYLE_AI_DESCRIPTION_MAX_LENGTH } from "@/lib/ai/style-prompt-builder";

type Kind = "client" | "ai";

export default function AdminMusicStyleDescriptionFields({
  defaultClientDescription = "",
  defaultAiDescription = "",
}: {
  defaultClientDescription?: string;
  defaultAiDescription?: string;
}) {
  const [clientDescription, setClientDescription] = useState(defaultClientDescription);
  const [aiDescription, setAiDescription] = useState(defaultAiDescription);
  const [pending, setPending] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const response = await fetch("/api/admin/ai/music-style-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleName,
          kind,
          otherDescription: (kind === "client" ? aiDescription : clientDescription) || undefined,
        }),
      });
      const data: { text?: string; error?: string } = await response.json().catch(() => ({}));
      if (!response.ok || !data.text) throw new Error(data.error || "La génération a échoué.");
      if (kind === "client") setClientDescription(data.text);
      else setAiDescription(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "La génération a échoué.");
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <div className="admin-editor-field">
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
      <div className="admin-editor-field">
        <div className="admin-field-label-row">
          <span>Consigne pour l’IA musicale (anglais)</span>
          <button
            type="button"
            className="admin-btn admin-btn-secondary admin-btn-sm"
            onClick={(event) => generate("ai", event.currentTarget.form)}
            disabled={pending !== null}
          >
            <Icon i="bot" size={13} />
            {pending === "ai" ? "Génération…" : aiDescription.trim() ? "Régénérer" : "Suggérer la consigne"}
          </button>
        </div>
        <textarea
          name="aiDescription"
          maxLength={STYLE_AI_DESCRIPTION_MAX_LENGTH}
          rows={4}
          value={aiDescription}
          onChange={(event) => setAiDescription(event.target.value)}
          aria-describedby="music-style-ai-hint"
          placeholder="BPM 90-110, swing groove, Rhodes keys, warm vocals… (en anglais)"
        />
      </div>
      <small id="music-style-ai-hint" className="admin-editor-field is-wide">
        Seule cette consigne en anglais (précédée du nom du style) est envoyée à Musicful ; la description client n’est
        jamais transmise. {aiDescription.length}/{STYLE_AI_DESCRIPTION_MAX_LENGTH} caractères
      </small>
      {error ? <p className="admin-field-error admin-editor-field is-wide">{error}</p> : null}
    </>
  );
}
