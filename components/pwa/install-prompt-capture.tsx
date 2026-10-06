"use client";

import { useEffect } from "react";
import { startInstallPromptCapture } from "@/lib/pwa/install-prompt";

/** Écoute l'invitation d'installation du navigateur dès le chargement de n'importe quelle page. Ne rend rien. */
export default function InstallPromptCapture() {
  useEffect(() => {
    startInstallPromptCapture();
  }, []);
  return null;
}
