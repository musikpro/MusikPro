"use client";

import { useState, useTransition } from "react";
import Icon from "@/components/banani/Icon";
import { refreshCatalogTranslations } from "@/app/admin/languages/actions";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

const MAX_CALLS = 40;

type Summary = { translated: number; alreadyUpToDate: number; remaining: number };

export default function RefreshCatalogTranslationsButton() {
  const showToast = useAdminToast();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  function handleClick() {
    setSummary(null);
    setProgress("Analyse des textes à traduire…");
    startTransition(async () => {
      let translated = 0;
      let alreadyUpToDate = 0;
      let remaining = 0;
      try {
        for (let call = 0; call < MAX_CALLS; call += 1) {
          const result = await refreshCatalogTranslations();
          if (!result.ok) {
            showToast({ message: result.message, tone: "error" });
            setSummary({ translated, alreadyUpToDate, remaining });
            return;
          }
          if (call === 0) alreadyUpToDate = result.alreadyUpToDate;
          translated += result.translated;
          remaining = result.remaining;
          if (remaining > 0) setProgress(`${translated} textes traduits, ${remaining} restants…`);
          if (remaining === 0 || result.translated === 0) break; // fini, ou aucun progrès : ne jamais boucler dans le vide
        }
        setSummary({ translated, alreadyUpToDate, remaining });
        showToast({
          message:
            translated === 0 && remaining === 0
              ? `Tout est déjà traduit (${alreadyUpToDate} textes à jour).`
              : `${translated} textes traduits, ${alreadyUpToDate} déjà à jour${remaining ? `, ${remaining} restent à traduire (relance)` : ""}.`,
          tone: remaining ? "info" : "success",
        });
      } catch (err) {
        showToast({ message: err instanceof Error ? err.message : "La mise à jour des traductions a échoué.", tone: "error" });
      } finally {
        setProgress(null);
      }
    });
  }

  return (
    <div className="admin-language-detection-actions">
      <button type="button" className="admin-secondary-action" onClick={handleClick} disabled={pending}>
        <Icon i="sparkles" size={16} />
        {pending ? "Actualisation en cours…" : "Actualiser les traductions"}
      </button>
      {pending && progress ? <p className="admin-language-detection-hint">{progress}</p> : null}
      {summary && !pending ? (
        <p className="admin-language-detection-hint">
          {summary.translated} textes traduits, {summary.alreadyUpToDate} déjà à jour
          {summary.remaining ? `, ${summary.remaining} restent à traduire` : ""}.
        </p>
      ) : null}
    </div>
  );
}
