import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ambientBackgroundTrack } from "@/db/schema";

export type AmbientTrackStatus = {
  enabled: boolean;
  songGroupId: string | null;
  title: string | null;
  audioUrl: string | null;
  volumePercent: number;
};

const DISABLED: AmbientTrackStatus = {
  enabled: false,
  songGroupId: null,
  title: null,
  audioUrl: null,
  volumePercent: 20,
};

/** Réglage global : la chanson d'ambiance jouée sur l'accueil du tableau de bord (démo et comptes réels). */
export async function getAmbientTrackStatus(): Promise<AmbientTrackStatus> {
  try {
    const [row] = await db
      .select({
        enabled: ambientBackgroundTrack.enabled,
        songGroupId: ambientBackgroundTrack.songGroupId,
        title: ambientBackgroundTrack.title,
        audioUrl: ambientBackgroundTrack.audioUrl,
        volumePercent: ambientBackgroundTrack.volumePercent,
      })
      .from(ambientBackgroundTrack)
      .where(eq(ambientBackgroundTrack.id, "global"))
      .limit(1);
    if (!row || !row.enabled || !row.audioUrl) return DISABLED;
    return {
      enabled: true,
      songGroupId: row.songGroupId,
      title: row.title,
      audioUrl: row.audioUrl,
      volumePercent: row.volumePercent,
    };
  } catch {
    return DISABLED;
  }
}
