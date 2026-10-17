"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isTrackingExcludedPath } from "@/lib/tracking-tags/paths";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Annonce chaque page vue au serveur (/api/meta/events), qui la relaie à l'API Conversions de Meta. Attend le cookie
 * _fbp posé par le pixel (3 s au plus) pour que Meta rapproche l'événement serveur de l'événement navigateur, puis
 * envoie hors du chemin critique (inactivité du navigateur). Jamais pour l'administration ni la démo : le layout
 * racine ne persiste pas lors d'une navigation interne, la page est donc re-contrôlée ici.
 */
export default function MetaCapiBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (isTrackingExcludedPath(pathname)) return;
    let cancelled = false;
    let timer: number | undefined;
    const send = () => {
      if (cancelled) return;
      const eventId = crypto.randomUUID();
      void fetch("/api/meta/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName: "PageView", eventId, path: pathname }),
        keepalive: true,
      }).catch(() => undefined);
    };
    const waitForPixelCookie = (attempt: number) => {
      if (cancelled) return;
      if (readCookie("_fbp") || attempt >= 12) return send();
      timer = window.setTimeout(() => waitForPixelCookie(attempt + 1), 250);
    };
    const start = () => waitForPixelCookie(0);
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(start);
    else timer = window.setTimeout(start, 1500);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [pathname]);
  return null;
}
