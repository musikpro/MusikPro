"use client";

import { useState, useTransition } from "react";
import Icon from "@/components/banani/Icon";
import { refreshCatalogTranslations } from "@/app/admin/languages/actions";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

const MAX_CALLS = 40;

const texts = (count: number) => `${count} ${count === 1 ? "texte" : "textes"}`;
const translatedLabel = (count: number) => `${texts(count)} ${count === 1 ? "traduit" : "traduits"}`;
const remainingLabel = (count: number) => `${texts(count)} ${count === 1 ? "restant" : "restants"}`;
const upToDateLabel = (count: number) => `${count} déjà à jour`;
const toTranslateLabel = (count: number) => `${count} ${count === 1 ? "reste" : "restent"} à traduire`;

const skippedLabel = (count: number) =>
  `${texts(count)} ${count === 1 ? "n’a pas pu être traduit" : "n’ont pas pu être traduits"} (réponse IA invalide), ${count === 1 ? "il sera retenté" : "ils seront retentés"} au prochain clic.`;

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
      let skipped = 0;
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
          skipped = result.skipped;
          if (remaining > 0) setProgress(`${translatedLabel(translated)}, ${remainingLabel(remaining)}…`);
          if (remaining === 0 || result.translated === 0 || remaining === skipped) break; // fini, ou aucun progrès : ne jamais boucler dans le vide
        }
        setSummary({ translated, alreadyUpToDate, remaining });
        if (skipped > 0) {
          showToast({
            message: `${translatedLabel(translated)}, ${upToDateLabel(alreadyUpToDate)}. ${skippedLabel(skipped)}`,
            tone: "info",
          });
          return;
        }
        showToast({
          message:
            translated === 0 && remaining === 0
              ? alreadyUpToDate > 0
                ? `Tout est déjà traduit (${texts(alreadyUpToDate)} à jour).`
                : "Rien à traduire."
              : `${translatedLabel(translated)}, ${upToDateLabel(alreadyUpToDate)}${remaining ? `, ${toTranslateLabel(remaining)} (relance)` : ""}.`,
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
        <Icon i="languages" size={16} />
        {pending ? "Actualisation en cours…" : "Actualiser les traductions"}
      </button>
      {pending && progress ? <p className="admin-language-detection-hint">{progress}</p> : null}
      {summary && !pending ? (
        <p className="admin-language-detection-hint">
          {translatedLabel(summary.translated)}, {upToDateLabel(summary.alreadyUpToDate)}
          {summary.remaining ? `, ${toTranslateLabel(summary.remaining)}` : ""}.
        </p>
      ) : null}
    </div>
  );
}
