import { z } from "zod";

/** Types de notification connus. Étendre cette liste (et l'affichage) pour en ajouter un. */
export const NOTIFICATION_TYPES = ["song_ready"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Nombre maximal de notifications renvoyées par la cloche. */
export const NOTIFICATIONS_PAGE_SIZE = 50;

/** Corps de `POST /api/notifications/read` : soit des identifiants précis, soit tout marquer comme lu. */
export const notificationsReadSchema = z.union([
  z.object({ all: z.literal(true) }).strict(),
  z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(NOTIFICATIONS_PAGE_SIZE) }).strict(),
]);
export type NotificationsReadInput = z.infer<typeof notificationsReadSchema>;

/** Un lien de notification est toujours interne : chemin relatif, jamais d'URL externe ni de `//`. */
export function isInternalNotificationHref(href: string | null | undefined): href is string {
  return typeof href === "string" && /^\/(?!\/)[\w\-./?=&%]*$/.test(href) && href.length <= 300;
}

/** Plateformes et langues acceptées pour l'enregistrement d'un appareil de notification. */
export const PUSH_PLATFORMS = ["android", "ios"] as const;
export const PUSH_LOCALES = ["fr", "en", "es", "pt"] as const;

/** Corps de `POST /api/push/devices` : jeton Firebase de l'appareil, plateforme et langue de l'interface. */
export const pushDeviceRegisterSchema = z
  .object({
    token: z
      .string()
      .min(20)
      .max(4096)
      .regex(/^[\w\-.:]+$/, "Jeton invalide"),
    platform: z.enum(PUSH_PLATFORMS),
    locale: z.enum(PUSH_LOCALES).default("fr"),
  })
  .strict();
export type PushDeviceRegisterInput = z.infer<typeof pushDeviceRegisterSchema>;

/** Corps de `DELETE /api/push/devices`. */
export const pushDeviceRemoveSchema = z
  .object({
    token: z
      .string()
      .min(20)
      .max(4096)
      .regex(/^[\w\-.:]+$/, "Jeton invalide"),
  })
  .strict();

/** Corps de `PUT /api/notifications/preferences`. */
export const notificationPreferencesSchema = z.object({ songReady: z.boolean() }).strict();
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
