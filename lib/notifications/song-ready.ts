import "server-only";

import { getNotificationPreferences } from "@/lib/notifications/devices";
import { createNotification } from "@/lib/notifications/server";
import { pushSongReady } from "@/lib/notifications/push-user";

type CompletedJob = {
  id: string;
  userId: string | null;
  songGroupId: string | null;
  title?: string | null;
};

/**
 * Notifie l'utilisateur qu'une chanson est prête. Appelée à chaque passage d'une version à « terminée » ; la clé
 * d'unicité est le groupe de chansons (les deux versions d'une même commande ne produisent qu'une notification), ou
 * la génération elle-même pour une chanson sans groupe. Respecte la préférence « Génération terminée ». Ne lève jamais.
 */
export async function notifySongReady(job: CompletedJob): Promise<void> {
  if (!job.userId) return;
  // « Génération terminée » coupée : ni cloche ni alerte téléphone. Une lecture en échec laisse la notification passer.
  const preferences = await getNotificationPreferences(job.userId).catch(() => ({ songReady: true }));
  if (!preferences.songReady) return;
  const href = "/dashboard/songs";
  const created = await createNotification({
    userId: job.userId,
    type: "song_ready",
    dedupeKey: `song_ready:${job.songGroupId ?? job.id}`,
    href,
    subject: job.title ?? null,
  });
  // Push seulement à la création : un webhook rejoué ou le rattrapage ne renvoie jamais la même alerte.
  if (created) await pushSongReady(job.userId, job.title ?? null, href);
}
