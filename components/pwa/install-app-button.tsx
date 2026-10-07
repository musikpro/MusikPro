"use client";

import Icon from "@/components/banani/Icon";
import { InstallGuide, useInstallAction } from "@/components/pwa/install-guide";
import { translate as t } from "@/lib/i18n/translate";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";
import { useAppInstalled, useDevicePlatform } from "@/lib/pwa/install-prompt";

/**
 * Bouton « Installer l'application » : toujours affiché. Il ouvre la fenêtre d'installation du navigateur quand elle
 * existe (Chrome / Edge), sinon le guide pas à pas (iPhone, Safari, invitation refusée) : sans fichier ni Play Store,
 * donc sans avertissement de sécurité.
 */
export default function InstallAppButton() {
  useI18nOverlay();
  const installed = useAppInstalled();
  const platform = useDevicePlatform();
  const { install, guideOpen, closeGuide } = useInstallAction();

  if (installed) return <p>{t("MusikPro est déjà installée sur cet appareil.")}</p>;
  return (
    <div className="download-cta-wrap">
      <button type="button" className="download-cta" onClick={() => void install()}>
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
      <InstallGuide open={guideOpen} onClose={closeGuide} platform={platform} />
    </div>
  );
}
