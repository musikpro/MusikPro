"use client";

import { useEffect } from "react";
import { hideNativeSplash } from "@/lib/mobile/native-splash";

/** Retire l'écran de lancement de l'application mobile une fois la page peinte (rien d'affiché, rien sur le web). */
export default function NativeSplashHider() {
  useEffect(() => {
    // Deux images : on attend que le navigateur ait réellement peint la page avant de retirer l'écran de lancement.
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(hideNativeSplash));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return null;
}
