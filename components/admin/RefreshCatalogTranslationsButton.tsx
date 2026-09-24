"use client";

import { useState, useTransition } from "react";
import Icon from "@/components/banani/Icon";
import { refreshCatalogTranslations } from "@/app/admin/languages/actions";

type Counts = { occasions: number; musicStyles: number; recipientRelations: number; plans: number };

export default function RefreshCatalogTranslationsButton() {
  const [pending, startTransition] = useTransition();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await refreshCatalogTranslations();
        setCounts(result.counts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "La mise à jour des traductions a échoué.");
      }
    });
  }

  return (
    <div className="admin-language-detection-actions">
      <button type="button" className="admin-secondary-action" onClick={handleClick} disabled={pending}>
        <Icon i="sparkles" size={16} />
        {pending ? "Actualisation en cours…" : "Actualiser les traductions"}
      </button>
      {counts && !pending ? (
        <p className="admin-language-detection-hint">
          Traductions à jour : {counts.occasions} occasions, {counts.musicStyles} styles musicaux,{" "}
          {counts.recipientRelations} relations, {counts.plans} offres de crédits.
        </p>
      ) : null}
      {error ? <p className="admin-field-error">{error}</p> : null}
    </div>
  );
}
