import "server-only";

import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { playbackSettings } from "@/db/schema";

export const PLAYBACK_SETTINGS_TAG = "playback-settings";

/**
 * Réglage global : une seule chanson à la fois sur une page (landing, tableaux de bord, page publique).
 * Absence de ligne ou base injoignable (migration pas encore appliquée) = activé, pour que le site garde le
 * comportement voulu par défaut. Lu dans le layout racine : mis en cache jusqu'à la prochaine modification admin.
 */
export async function isExclusivePlaybackEnabled(): Promise<boolean> {
  try {
    return await unstable_cache(
      async () => {
        const [row] = await db
          .select({ enabled: playbackSettings.exclusivePlaybackEnabled })
          .from(playbackSettings)
          .where(eq(playbackSettings.id, "global"))
          .limit(1);
        return row?.enabled ?? true;
      },
      [PLAYBACK_SETTINGS_TAG],
      { tags: [PLAYBACK_SETTINGS_TAG], revalidate: 3600 },
    )();
  } catch {
    return true;
  }
}
