"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { translate as t } from "@/lib/i18n/translate";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeStandalone(onChange: () => void) {
  const media = window.matchMedia(STANDALONE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * Bouton « Installer l'application » (Chrome / Edge sur Android et ordinateur) : installe le site comme une application
 * sur l'écran d'accueil, sans passer par un fichier ni par le Play Store, donc sans avertissement de sécurité. Quand le
 * navigateur ne propose pas l'installation (déjà installée, Firefox, Safari…), affiche l'indication manuelle.
 */
export default function InstallAppButton() {
  useI18nOverlay();
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  // Déjà ouverte comme application installée (rendu serveur = faux : pas d'écart d'hydratation).
  const standalone = useSyncExternalStore(
    subscribeStandalone,
    () => window.matchMedia(STANDALONE_QUERY).matches,
    () => false,
  );
  const installed = standalone || justInstalled;

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => setJustInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return <p>{t("MusikPro est déjà installée sur cet appareil.")}</p>;
  if (promptEvent) {
    return (
      <button
        type="button"
        className="legal-brand"
        onClick={async () => {
          await promptEvent.prompt();
          await promptEvent.userChoice.catch(() => undefined);
          setPromptEvent(null);
        }}
      >
        {t("Installer l'application")}
      </button>
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
