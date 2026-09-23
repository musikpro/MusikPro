"use client";

import { useState } from "react";
import Icon from "@/components/banani/Icon";

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
            <Icon i="sparkles" size={13} />
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
          <span>Description pour l’IA génératrice de musique</span>
          <button
            type="button"
            className="admin-btn admin-btn-secondary admin-btn-sm"
            onClick={(event) => generate("ai", event.currentTarget.form)}
            disabled={pending !== null}
          >
            <Icon i="sparkles" size={13} />
            {pending === "ai" ? "Génération…" : aiDescription.trim() ? "Régénérer" : "Générer avec l’IA"}
          </button>
        </div>
        <textarea
          name="aiDescription"
          maxLength={600}
          rows={4}
          value={aiDescription}
          onChange={(event) => setAiDescription(event.target.value)}
          placeholder="Détails techniques pour guider fidèlement l’IA : rythme, instruments, structure, tempo, voix"
        />
      </div>
      {error ? <p className="admin-field-error admin-editor-field is-wide">{error}</p> : null}
    </>
  );
}
