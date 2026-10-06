"use client";

import { isNativeMobileApp } from "@/lib/mobile/native-runtime";

type SplashPlugin = { hide?: (options?: { fadeOutDuration?: number }) => Promise<unknown> | unknown };

/**
 * Masque l'écran de lancement natif (Capacitor SplashScreen) dès que la page du site est affichée.
 *
 * Pourquoi : l'application charge le site distant ; avec une durée fixe, l'écran de lancement disparaissait avant
 * l'arrivée de la page et l'utilisateur voyait un écran vide. `capacitor.config.ts` garde maintenant l'écran de
 * lancement jusqu'à 10 s au plus (sécurité si le site ne répond pas) ; cette fonction le retire dès que possible.
 * Sans effet hors application native, et jamais bloquante : une erreur du plugin est ignorée.
 */
export function hideNativeSplash(): void {
  if (!isNativeMobileApp()) return;
  try {
    const plugins = (window.Capacitor as unknown as { Plugins?: Record<string, SplashPlugin> } | undefined)?.Plugins;
    void Promise.resolve(plugins?.SplashScreen?.hide?.({ fadeOutDuration: 300 })).catch(() => undefined);
  } catch {
    // Le plugin peut être absent : l'écran de lancement se retire alors tout seul à la fin de sa durée maximale.
  }
}
