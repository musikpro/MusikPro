import "server-only";
import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { audioProviderConfigs } from "@/db/schema";
import { DEFAULT_AUDIO_PROVIDER_ID, isKnownAudioProviderId } from "./catalog";

/**
 * The provider new song generations are sent to: the row flagged `isDefaultForAudio`, else Musicful
 * (historical behaviour, also when the column/row does not exist yet).
 */
export async function getActiveAudioProviderId(): Promise<string> {
  try {
    const [row] = await getServiceDb()
      .select({ provider: audioProviderConfigs.provider })
      .from(audioProviderConfigs)
      .where(eq(audioProviderConfigs.isDefaultForAudio, true))
      .limit(1);
    if (row && isKnownAudioProviderId(row.provider)) return row.provider;
  } catch {
    // Column not migrated yet: keep Musicful.
  }
  return DEFAULT_AUDIO_PROVIDER_ID;
}
