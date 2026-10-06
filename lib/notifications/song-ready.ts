import "server-only";

import { createNotification } from "@/lib/notifications/server";

type CompletedJob = {
  id: string;
  userId: string | null;
  songGroupId: string | null;
  title?: string | null;
};

/**
 * Notifie l'utilisateur qu'une chanson est prête. Appelée à chaque passage d'une version à « terminée » ; la clé
 * d'unicité est le groupe de chansons (les deux versions d'une même commande ne produisent qu'une notification), ou
 * la génération elle-même pour une chanson sans groupe. Ne lève jamais.
 */
export async function notifySongReady(job: CompletedJob): Promise<void> {
  if (!job.userId) return;
  await createNotification({
    userId: job.userId,
    type: "song_ready",
    dedupeKey: `song_ready:${job.songGroupId ?? job.id}`,
    href: "/dashboard/songs",
    subject: job.title ?? null,
  });
}
