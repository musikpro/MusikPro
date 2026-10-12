"use client";

import { useEffect, useState } from "react";
import { InlineNotice } from "@/components/ui/inline-notice";
import { GUEST_RESUME_COOKIE, isSocialInAppBrowser } from "@/lib/guest/resume";
import { translate as t } from "@/lib/i18n/translate";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";

/**
 * Bandeau des pages de connexion pour un visiteur venu d'un lien invité : rassure sur la conservation de la chanson en
 * cours et, dans le navigateur intégré d'un réseau social (où Google refuse la connexion), oriente vers l'e-mail ou
 * vers le navigateur du téléphone. Invisible pour tout autre visiteur.
 */
export function GuestAuthNotice() {
  useI18nOverlay();
  const [state, setState] = useState<{ guest: boolean; inApp: boolean; copied: boolean }>({
    guest: false,
    inApp: false,
    copied: false,
  });

  useEffect(() => {
    const guest = document.cookie.split("; ").some((entry) => entry.startsWith(`${GUEST_RESUME_COOKIE}=`));
    window.queueMicrotask(() =>
      setState((previous) => ({ ...previous, guest, inApp: isSocialInAppBrowser(navigator.userAgent) })),
    );
  }, []);

  if (!state.guest) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setState((previous) => ({ ...previous, copied: true }));
    } catch {
      // Presse-papiers indisponible : le conseil reste affiché.
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-4 flex flex-col gap-2">
      <InlineNotice tone="success">
        {t("Ta chanson en cours est gardée : connecte-toi pour la retrouver.")}
      </InlineNotice>
      {state.inApp && (
        <InlineNotice tone="warning">
          {t(
            "Google peut refuser la connexion dans ce navigateur intégré. Utilise ton adresse e-mail ci-dessous, ou ouvre ce lien dans Chrome ou Safari.",
          )}{" "}
          <button type="button" className="underline font-semibold" onClick={copyLink}>
            {state.copied ? t("Lien copié") : t("Copier le lien")}
          </button>
        </InlineNotice>
      )}
    </div>
  );
}
