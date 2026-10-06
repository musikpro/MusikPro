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
