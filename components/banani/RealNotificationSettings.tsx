"use client";
import { useEffect, useState } from "react";
import { translate as t, getDisplayLocale } from "@/lib/i18n/translate";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";
import { enableNativePush, nativePushStatus, type NativePushStatus } from "@/lib/mobile/native-push";
import Icon from "./Icon";

/**
 * Réglages de notification d'un compte réel : seuls les réglages réellement branchés sont proposés (aujourd'hui
 * « Génération terminée »). La démonstration garde ses interrupteurs d'exemple (NotificationsSettingsScreen).
 */
export default function RealNotificationSettings() {
  useI18nOverlay();
  const [songReady, setSongReady] = useState<boolean | null>(null);
  const [pushAvailable, setPushAvailable] = useState(false);
  const [failed, setFailed] = useState(false);
  const [push, setPush] = useState<NativePushStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications/preferences", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as { songReady: boolean; pushAvailable?: boolean };
      })
      .then((data) => {
        if (cancelled) return;
        setSongReady(data.songReady);
        setPushAvailable(data.pushAvailable === true);
      })
      .catch(() => !cancelled && setFailed(true));
    void nativePushStatus().then((status) => !cancelled && setPush(status));
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSongReady = async () => {
    if (songReady === null) return;
    const next = !songReady;
    setSongReady(next);
    const response = await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songReady: next }),
    }).catch(() => null);
    if (!response?.ok) setSongReady(!next);
  };

  const enablePush = async () => {
    setBusy(true);
    setPush(await enableNativePush(getDisplayLocale()));
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      {pushAvailable && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">{t("Sur ce téléphone")}</h3>
          {push === "unsupported" && (
            <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              {t("Les notifications sur téléphone sont disponibles dans l'application Android.")}
            </p>
          )}
          {push === "prompt" && (
            <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-3">
              <p className="text-sm text-foreground">
                {t("Recevez une alerte dès que votre chanson est prête, même quand l'application est fermée.")}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void enablePush()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {t("Activer les notifications")}
              </button>
            </div>
          )}
          {push === "denied" && (
            <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              {t(
                "Les notifications sont bloquées. Autorisez-les dans les réglages de votre téléphone, rubrique Applications.",
              )}
            </p>
          )}
          {push === "granted" && (
            <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground">
              {t("Les notifications sont activées sur ce téléphone.")}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase">{t("Vos chansons")}</h3>
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Icon i="music" size={18} className="text-primary" />
            <span className="text-sm font-medium text-foreground">{t("Génération terminée")}</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-label={t("Génération terminée")}
            aria-checked={songReady === true}
            disabled={songReady === null}
            onClick={() => void toggleSongReady()}
            className={`demo-toggle w-10 h-6 rounded-full flex items-center ${
              songReady ? "bg-primary justify-end pr-1" : "bg-muted justify-start pl-1"
            }`}
          >
            <span className="w-5 h-5 bg-white rounded-full" />
          </button>
        </div>
        {failed && (
          <p role="alert" className="text-sm text-muted-foreground">
            {t("Les réglages sont indisponibles pour le moment.")}
          </p>
        )}
      </div>
    </div>
  );
}
