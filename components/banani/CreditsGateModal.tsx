"use client";
import "./credits-gate.css";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { translate as t, translateTemplate } from "@/lib/i18n/translate";
import { CREDITS_PER_GENERATION } from "@/lib/credit-plans/catalog";
import Icon from "./Icon";

/**
 * Fenêtre d'information affichée à la dernière étape avant la génération des paroles lorsque le solde est insuffisant :
 * les paroles sont facturées au propriétaire par le fournisseur IA, donc les crédits de la chanson sont demandés
 * d'abord. Rendue dans `document.body` pour échapper aux contextes d'empilement des écrans animés.
 */
export default function CreditsGateModal({
  open,
  balance,
  onBuy,
  onClose,
}: {
  open: boolean;
  balance: number;
  onBuy: () => void;
  onClose: () => void;
}) {
  const buyRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    buyRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const steps = [
    t("Choisis ton offre de crédits"),
    t("Règle ton paiement en toute sécurité"),
    t("Tes paroles sont générées automatiquement dès que le paiement est confirmé"),
  ];

  return createPortal(
    <div className="credits-gate-overlay">
      <button
        type="button"
        className="credits-gate-backdrop"
        tabIndex={-1}
        aria-label={t("Fermer")}
        onClick={onClose}
      />
      <div
        className="credits-gate-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-gate-title"
        aria-describedby="credits-gate-description"
      >
        <span className="credits-gate-icon" aria-hidden="true">
          <Icon i="coins" size={26} />
        </span>
        <p className="credits-gate-kicker">{t("Dernière étape")}</p>
        <h2 id="credits-gate-title">{t("Active tes crédits pour générer tes paroles")}</h2>
        <p id="credits-gate-description" className="credits-gate-text">
          {translateTemplate(
            "Tes informations sont complètes. Pour rédiger tes paroles puis composer ta chanson, il faut disposer de {credits} crédits : rien n’est débité avant la composition.",
            { credits: CREDITS_PER_GENERATION },
          )}
        </p>

        <dl className="credits-gate-balance">
          <div>
            <dt>{t("Ton solde")}</dt>
            <dd>{balance === 1 ? t("1 crédit") : translateTemplate("{count} crédits", { count: balance })}</dd>
          </div>
          <div>
            <dt>{t("Nécessaire")}</dt>
            <dd>{translateTemplate("{count} crédits", { count: CREDITS_PER_GENERATION })}</dd>
          </div>
        </dl>

        <ol className="credits-gate-steps">
          {steps.map((step, index) => (
            <li key={step}>
              <span aria-hidden="true">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>

        <p className="credits-gate-reassure">
          <Icon i="shield-check" size={16} />
          {t("Tes réponses sont conservées : tu ne perds rien en passant par le paiement.")}
        </p>

        <div className="credits-gate-actions">
          <button ref={buyRef} type="button" className="credits-gate-primary" onClick={onBuy}>
            {t("Acheter des crédits")} <Icon i="arrow-right" size={18} />
          </button>
          <button type="button" className="credits-gate-secondary" onClick={onClose}>
            {t("Plus tard")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
