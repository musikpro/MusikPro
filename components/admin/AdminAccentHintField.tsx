"use client";

import { useState } from "react";
import Icon from "@/components/banani/Icon";
import { ACCENT_HINT_MAX_LENGTH } from "@/lib/ai/style-prompt-builder";

const PLACEHOLDER =
  "Ex. natural Ivorian French accent, Abidjan urban vocal style, authentic Côte d’Ivoire pronunciation";

/**
 * Consigne d'accent envoyée à l'IA musicale (anglais). « Générer avec l'IA » lit le pays (saisi en français), la langue
 * et les styles cochés du formulaire, cherche sur Internet, puis rédige la consigne en anglais. Aucune notification
 * toast à la génération : seule l'action « Enregistrer » en déclenche une ; une erreur reste affichée sous le champ.
 */
export default function AdminAccentHintField({
  defaultValue = "",
  languageNames,
}: {
  defaultValue?: string;
  /** Code de langue → nom (« fr » → « Français »). */
  languageNames: Record<string, string>;
}) {
  const [value, setValue] = useState(defaultValue);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function generate(form: HTMLFormElement | null) {
    if (!form) return;
    const data = new FormData(form);
    const country = String(data.get("country") ?? "").trim();
    const languageCode = String(data.get("languageCode") ?? "");
    const languageName = languageNames[languageCode] ?? "";
    if (country.length < 2) {
      setError("Renseigne d’abord le pays de l’accent (par exemple Côte d’Ivoire).");
      return;
    }
    if (!languageName) {
      setError("Choisis d’abord la langue des paroles.");
      return;
    }
    const styleNames = Array.from(form.querySelectorAll<HTMLInputElement>("input[name=styleIds]:checked"))
      .map((input) => input.dataset.styleName ?? "")
      .filter(Boolean);
    setPending(true);
    setError(null);
    setNote(null);
    try {
      const response = await fetch("/api/admin/ai/accent-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageName, country, styleNames }),
      });
      const result: { text?: string; error?: string; webSearch?: "used" | "unavailable" | "off" } = await response
        .json()
        .catch(() => ({}));
      if (!response.ok || !result.text) throw new Error(result.error || "La génération a échoué.");
      setValue(result.text);
      setNote(
        result.webSearch === "used"
          ? "Consigne rédigée en anglais après une recherche sur Internet sur cet accent."
          : result.webSearch === "unavailable"
            ? "La recherche Internet n’est pas disponible avec ce fournisseur IA : consigne rédigée sans recherche."
            : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "La génération a échoué.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-editor-field is-wide">
      <div className="admin-field-label-row">
        <span>Consigne envoyée à l’IA musicale, en anglais</span>
        <button
          type="button"
          className="admin-btn admin-btn-secondary admin-btn-sm"
          onClick={(event) => void generate(event.currentTarget.form)}
          disabled={pending}
        >
          <Icon i="bot" size={13} />
          {pending ? "Recherche et génération…" : value.trim() ? "Régénérer" : "Générer avec l’IA"}
        </button>
      </div>
      <textarea
        name="aiHint"
        required
        rows={3}
        maxLength={ACCENT_HINT_MAX_LENGTH}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={PLACEHOLDER}
        aria-describedby="accent-hint-help"
      />
      <small id="accent-hint-help">
        {value.length}/{ACCENT_HINT_MAX_LENGTH} caractères. Cette consigne est prioritaire : elle est placée dans la
        partie voix de chaque chanson concernée. « Avoid European or Western accents » est ajouté automatiquement à
        toutes les chansons.
      </small>
      {note ? <p role="status">{note}</p> : null}
      {error ? <p className="admin-field-error">{error}</p> : null}
    </div>
  );
}
