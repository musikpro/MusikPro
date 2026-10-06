"use client";

import { useState } from "react";
import Icon from "@/components/banani/Icon";
import { InlineNotice } from "@/components/ui/inline-notice";
import { authClient } from "@/lib/auth/client";
import { translate as t } from "@/lib/i18n/translate";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";

type Step = "idle" | "confirm" | "sending" | "sent";

/**
 * Suppression de compte en libre-service (exigence Apple et Google Play). Aucune suppression immédiate : un e-mail de
 * confirmation part vers l'adresse du compte et c'est son lien qui supprime le compte (Better Auth `deleteUser`).
 */
export default function DeleteAccountPanel() {
  useI18nOverlay();
  const [step, setStep] = useState<Step>("idle");
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState("");

  async function requestDeletion() {
    if (!understood || step === "sending") return;
    setError("");
    setStep("sending");
    try {
      const result = await authClient.deleteUser({ callbackURL: "/account-deleted" });
      if (result.error) {
        setError(
          result.error.status === 403
            ? t("Ce compte ne peut pas être supprimé ici.")
            : t("Impossible d’envoyer l’e-mail de confirmation. Réessaie dans un instant."),
        );
        setStep("confirm");
        return;
      }
      setStep("sent");
    } catch {
      setError(t("Impossible d’envoyer l’e-mail de confirmation. Réessaie dans un instant."));
      setStep("confirm");
    }
  }

  return (
    <section className="security-panel delete-account-panel" aria-labelledby="delete-account-title">
      <div className="security-panel-heading">
        <span>
          <Icon i="trash" size={20} />
        </span>
        <div>
          <h2 id="delete-account-title">{t("Supprimer mon compte")}</h2>
          <p>{t("Efface ton compte, tes chansons et tes informations personnelles. Cette action est définitive.")}</p>
        </div>
      </div>

      {step === "sent" ? (
        <InlineNotice tone="success">
          {t(
            "Un e-mail de confirmation vient de t’être envoyé. Clique sur le lien qu’il contient pour terminer la suppression.",
          )}
        </InlineNotice>
      ) : step === "idle" ? (
        <button type="button" className="delete-account-button" onClick={() => setStep("confirm")}>
          {t("Supprimer mon compte")}
        </button>
      ) : (
        <div className="delete-account-confirm">
          <ul>
            <li>{t("Tes chansons et leurs liens de partage seront supprimés.")}</li>
            <li>{t("Tes crédits restants seront perdus.")}</li>
            <li>{t("L’historique de tes paiements est conservé de façon anonyme, comme la loi l’exige.")}</li>
          </ul>
          <label className="delete-account-check">
            <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} />
            <span>{t("Je comprends que la suppression est définitive.")}</span>
          </label>
          {error && <InlineNotice tone="error">{error}</InlineNotice>}
          <div className="delete-account-actions">
            <button
              type="button"
              className="delete-account-button"
              disabled={!understood || step === "sending"}
              onClick={requestDeletion}
            >
              {step === "sending" ? t("Envoi en cours…") : t("Envoyer l’e-mail de confirmation")}
            </button>
            <button
              type="button"
              className="delete-account-cancel"
              disabled={step === "sending"}
              onClick={() => {
                setStep("idle");
                setUnderstood(false);
                setError("");
              }}
            >
              {t("Annuler")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
