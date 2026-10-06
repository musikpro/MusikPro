"use client";

import { useEffect } from "react";
import { nativePushStatus, registerNativePush } from "@/lib/mobile/native-push";
import { getDisplayLocale } from "@/lib/i18n/translate";

/**
 * Au lancement de l'application Android, ré-enregistre l'appareil auprès du serveur si l'autorisation de notification
 * est déjà accordée et que le serveur sait envoyer des notifications (le jeton Firebase peut changer). Ne demande jamais l'autorisation : elle se demande depuis
 * « Notifications », au moment choisi par l'utilisateur. Ne rend rien.
 */
export default function NativePushRegistrar() {
  useEffect(() => {
    void (async () => {
      if ((await nativePushStatus()) !== "granted") return;
      // Tant que le serveur n'a pas de compte Firebase, on n'appelle pas le plugin (il exige google-services.json).
      const available = await fetch("/api/notifications/preferences", { cache: "no-store" })
        .then(async (response) =>
          response.ok ? ((await response.json()) as { pushAvailable?: boolean }).pushAvailable === true : false,
        )
        .catch(() => false);
      if (available) void registerNativePush(getDisplayLocale());
    })();
  }, []);
  return null;
}
