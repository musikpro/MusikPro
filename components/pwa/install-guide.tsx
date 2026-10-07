"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/banani/Icon";
import { translate as t } from "@/lib/i18n/translate";
import { promptInstall, useInstallPromptAvailable, type DevicePlatform } from "@/lib/pwa/install-prompt";

/**
 * Action « Installer l'application » partagée par tous les boutons : ouvre la fenêtre d'installation du navigateur
 * quand elle est disponible (Chrome / Edge) ; sinon — iPhone, Android sans invitation, invitation déjà refusée —
 * ouvre le guide pas à pas, afin que l'installation reste possible à tout moment depuis n'importe quel bouton.
 */
export function useInstallAction() {
  const canPrompt = useInstallPromptAvailable();
  const [guideOpen, setGuideOpen] = useState(false);
  const install = useCallback(async () => {
    if (canPrompt && (await promptInstall()) === "accepted") return;
    setGuideOpen(true);
  }, [canPrompt]);
  return { install, guideOpen, closeGuide: () => setGuideOpen(false) };
}

type Step = { icon: string; title: string; hint?: string };

function stepsFor(platform: DevicePlatform): Step[] {
  if (platform === "ios") {
    return [
      {
        icon: "compass",
        title: t("Ouvrez musikpro.net dans Safari"),
        hint: t("L'installation ne marche pas depuis un autre navigateur."),
      },
      {
        icon: "share",
        title: t("Touchez le bouton Partager"),
        hint: t("Le carré avec une flèche, en bas de l'écran."),
      },
      {
        icon: "square-plus",
        title: t("Choisissez « Sur l'écran d'accueil »"),
        hint: t("Faites défiler le menu si besoin, puis touchez Ajouter."),
      },
    ];
  }
  return [
    {
      icon: "ellipsis-vertical",
      title: t("Ouvrez le menu de Chrome"),
      hint: t("Les trois points ⋮, en haut à droite."),
    },
    {
      icon: "download",
      title: t("Touchez « Installer l'application »"),
      hint: t("Ou « Ajouter à l'écran d'accueil » selon votre téléphone."),
    },
    { icon: "smartphone", title: t("Confirmez"), hint: t("L'icône MusikPro apparaît sur votre écran d'accueil.") },
  ];
}

/** Guide d'installation en fenêtre modale (feuille du bas sur mobile). Fermeture : bouton, Échap ou toucher à l'extérieur. */
export function InstallGuide({
  open,
  onClose,
  platform,
}: {
  open: boolean;
  onClose: () => void;
  platform: DevicePlatform;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="install-guide"
      aria-labelledby="install-guide-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="install-guide__sheet">
        <h2 id="install-guide-title" className="install-guide__title">
          {platform === "ios" ? t("Installer MusikPro sur votre iPhone") : t("Installer MusikPro sur votre téléphone")}
        </h2>
        <p className="install-guide__lead">{t("Trois gestes, sans boutique d'applications. Gratuit.")}</p>
        <ol className="install-guide__steps">
          {stepsFor(platform).map((step, index) => (
            <li key={step.icon}>
              <span className="install-guide__num" aria-hidden="true">
                {index + 1}
              </span>
              <span className="install-guide__icon" aria-hidden="true">
                <Icon i={step.icon} size={20} />
              </span>
              <span className="install-guide__text">
                <strong>{step.title}</strong>
                {step.hint ? <small>{step.hint}</small> : null}
              </span>
            </li>
          ))}
        </ol>
        <button type="button" className="install-guide__close" onClick={onClose}>
          {t("J'ai compris")}
        </button>
      </div>
    </dialog>
  );
}
