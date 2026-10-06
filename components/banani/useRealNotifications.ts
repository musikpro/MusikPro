"use client";
import { useCallback, useEffect, useState } from "react";
import { getDisplayLocale, translate as t, translateTemplate } from "@/lib/i18n/translate";

type ApiNotification = {
  id: string;
  type: string;
  subject: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  href: string | null;
};

/** Texte de la notification selon son type ; le sujet (ex. titre de chanson) n'est jamais traduit. */
function describe(item: ApiNotification): { title: string; message: string } {
  if (item.type === "song_ready") {
    return {
      title: t("Chanson prête"),
      message: item.subject
        ? translateTemplate("Ta chanson « {title} » est prête à écouter !", { title: item.subject })
        : t("Ta chanson est prête à écouter !"),
    };
  }
  return { title: t("Notification"), message: "" };
}

function relativeTime(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(getDisplayLocale(), { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return formatter.format(Math.min(0, seconds), "second");
  if (abs < 3600) return formatter.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return formatter.format(Math.round(seconds / 3600), "hour");
  return formatter.format(Math.round(seconds / 86_400), "day");
}

/** Notifications réelles du compte connecté (lecture, marquage « lu »). Inactif quand `enabled` est faux (démo). */
export function useRealNotifications(enabled: boolean) {
  const [items, setItems] = useState<ApiNotification[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/notifications", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as { items: ApiNotification[] };
      })
      .then((data) => !cancelled && setItems(data.items))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const markRead = useCallback(async (ids?: string[]) => {
    setItems((current) =>
      current ? current.map((item) => (!ids || ids.includes(item.id) ? { ...item, read: true } : item)) : current,
    );
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : { all: true }),
    }).catch(() => undefined);
  }, []);

  const view: NotificationItem[] = (items ?? []).map((item) => ({
    id: item.id,
    type: item.type === "song_ready" ? "music" : "bell",
    ...describe(item),
    time: relativeTime(item.createdAt),
    unread: !item.read,
    href: item.href,
  }));

  return { items: view, loading: enabled && items === null && !failed, failed, markRead };
}
