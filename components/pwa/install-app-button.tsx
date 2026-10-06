"use client";

import Icon from "@/components/banani/Icon";
import { translate as t } from "@/lib/i18n/translate";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";
import { promptInstall, useAppInstalled, useInstallPromptAvailable } from "@/lib/pwa/install-prompt";

/**
 * Bouton « Installer l'application » (Chrome / Edge sur Android et ordinateur) : installe le site comme une application
 * sur l'écran d'accueil, sans passer par un fichier ni par le Play Store, donc sans avertissement de sécurité. Quand le
 * navigateur ne propose pas l'installation (déjà installée, Firefox, Safari…), affiche l'indication manuelle.
 */
export default function InstallAppButton() {
  useI18nOverlay();
  const installed = useAppInstalled();
  const canPrompt = useInstallPromptAvailable();

  if (installed) return <p>{t("MusikPro est déjà installée sur cet appareil.")}</p>;
  if (canPrompt) {
    return (
      <div className="download-cta-wrap">
        <button type="button" className="download-cta" onClick={() => void promptInstall()}>
          <span className="download-cta-icon" aria-hidden="true">
            <Icon i="download" size={22} />
          </span>
          <span className="download-cta-text">
            <strong>{t("Installer l'application")}</strong>
            <small>{t("Gratuit · en 30 secondes")}</small>
          </span>
        </button>
        <ul className="download-cta-trust">
          <li>{t("Sans avertissement de sécurité")}</li>
          <li>{t("Mises à jour automatiques")}</li>
        </ul>
      </div>
    );
  }
  return (
    <p>
      {t(
        "Dans Chrome, ouvrez le menu ⋮ puis choisissez « Installer l'application » (ou « Ajouter à l'écran d'accueil »).",
      )}
    </p>
  );
}
