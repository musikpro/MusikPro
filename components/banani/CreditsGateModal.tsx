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
  guest = false,
}: {
  open: boolean;
  balance: number;
  onBuy: () => void;
  onClose: () => void;
  /** Visiteur sans compte (lien invité) : on lui demande de se connecter avant d'acheter des crédits. */
  guest?: boolean;
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
        className="credits-gate-dialog credits-gate-dialog--simple"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-gate-title"
        aria-describedby="credits-gate-description"
      >
        <span className="credits-gate-icon" aria-hidden="true">
          <Icon i="coins" size={26} />
        </span>
        <h2 id="credits-gate-title">
          {guest ? t("Crée ton compte pour continuer") : t("Active tes crédits")}
        </h2>
        <p id="credits-gate-description" className="credits-gate-text">
          {guest
            ? t("C’est gratuit et rapide. Tes réponses sont conservées.")
            : translateTemplate("Il te faut {credits} crédits pour générer ta chanson.", {
                credits: CREDITS_PER_GENERATION,
              })}
        </p>

        {guest ? null : (
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
        )}

        <div className="credits-gate-actions">
          <button ref={buyRef} type="button" className="credits-gate-primary" onClick={onBuy}>
            {guest ? t("Créer mon compte") : t("Acheter des crédits")} <Icon i="arrow-right" size={18} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
