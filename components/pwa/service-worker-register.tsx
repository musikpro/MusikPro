"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      // À chaque ouverture, on rafraîchit l'accueil public gardé pour l'affichage hors-ligne.
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => registration.active?.postMessage("refresh-landing"))
      .catch(() => {
        // Registration failure must not break the Web application.
      });
  }, []);
  return null;
}
