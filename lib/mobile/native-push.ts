"use client";

import { isNativeMobileApp, nativeMobilePlatform } from "@/lib/mobile/native-runtime";
import { isInternalNotificationHref } from "@/lib/validation/notifications";

type PermissionState = "granted" | "denied" | "prompt" | "prompt-with-rationale";
type PushPlugin = {
  checkPermissions: () => Promise<{ receive: PermissionState }>;
  requestPermissions: () => Promise<{ receive: PermissionState }>;
  register: () => Promise<void>;
  createChannel?: (channel: { id: string; name: string; importance: number }) => Promise<void>;
  addListener: (event: string, handler: (payload: never) => void) => Promise<{ remove: () => Promise<void> }>;
};

export type NativePushStatus = "unsupported" | "granted" | "denied" | "prompt";

/** Plugin natif Firebase, exposé par le pont Capacitor même quand le site est chargé à distance. Android seulement. */
function plugin(): PushPlugin | null {
  if (!isNativeMobileApp() || nativeMobilePlatform() !== "android") return null;
  const plugins = (window.Capacitor as unknown as { Plugins?: Record<string, PushPlugin> } | undefined)?.Plugins;
  return plugins?.PushNotifications ?? null;
}

export function isNativePushSupported(): boolean {
  return plugin() !== null;
}

export async function nativePushStatus(): Promise<NativePushStatus> {
  const push = plugin();
  if (!push) return "unsupported";
  try {
    const { receive } = await push.checkPermissions();
    return receive === "granted" ? "granted" : receive === "denied" ? "denied" : "prompt";
  } catch {
    return "unsupported";
  }
}

let listening = false;

/** Envoie le jeton Firebase au serveur pour le compte connecté. Une erreur réseau est ignorée (nouvel essai au prochain lancement). */
async function sendToken(token: string, locale: string): Promise<void> {
  await fetch("/api/push/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, platform: "android", locale }),
  }).catch(() => undefined);
}

/**
 * Enregistre l'appareil auprès de Firebase puis du serveur, et ouvre la page indiquée quand l'utilisateur touche une
 * notification. Suppose l'autorisation déjà accordée.
 */
export async function registerNativePush(locale: string): Promise<void> {
  const push = plugin();
  if (!push) return;
  try {
    if (!listening) {
      listening = true;
      await push.addListener(
        "registration",
        ((event: { value: string }) => void sendToken(event.value, locale)) as never,
      );
      await push.addListener("pushNotificationActionPerformed", ((event: {
        notification?: { data?: { href?: string } };
      }) => {
        const href = event.notification?.data?.href;
        if (isInternalNotificationHref(href)) window.location.assign(href);
      }) as never);
    }
    await push.createChannel?.({ id: "default", name: "Chansons", importance: 4 }).catch(() => undefined);
    await push.register();
  } catch {
    listening = false;
  }
}

/** Demande l'autorisation d'afficher des notifications (boîte du système) puis enregistre l'appareil si elle est accordée. */
export async function enableNativePush(locale: string): Promise<NativePushStatus> {
  const push = plugin();
  if (!push) return "unsupported";
  try {
    const { receive } = await push.requestPermissions();
    if (receive !== "granted") return receive === "denied" ? "denied" : "prompt";
    await registerNativePush(locale);
    return "granted";
  } catch {
    return "unsupported";
  }
}
