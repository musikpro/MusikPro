import "server-only";

import { deletePushDevicesByToken, getNotificationPreferences, listPushDevices } from "@/lib/notifications/devices";
import { isPushConfigured, sendPush } from "@/lib/notifications/fcm";
import { i18nKey } from "@/lib/i18n/key";
import { primeOverlay } from "@/lib/i18n/overlay-server";
import { translateForLocale, translateTemplateForLocale, type Locale } from "@/lib/i18n/translate";
import { createLogger } from "@/lib/observability/logger";

const logger = createLogger("push-user");

const TITLE_SONG_READY = i18nKey("Chanson prête");
const BODY_SONG_READY = i18nKey("Ta chanson « {title} » est prête à écouter !");
const BODY_SONG_READY_NO_TITLE = i18nKey("Ta chanson est prête à écouter !");

const KNOWN_LOCALES: readonly Locale[] = ["fr", "en", "es", "pt"];
const asLocale = (value: string): Locale => KNOWN_LOCALES.find((locale) => locale === value) ?? "fr";

/**
 * Prévient les téléphones de l'utilisateur qu'une chanson est prête, dans la langue enregistrée de chaque appareil.
 * Respecte la préférence « Génération terminée ». Ne lève jamais : une panne d'envoi ne doit rien casser.
 */
export async function pushSongReady(userId: string, subject: string | null, href: string): Promise<void> {
  if (!isPushConfigured()) return;
  try {
    if (!(await getNotificationPreferences(userId)).songReady) return;
    const devices = await listPushDevices(userId);
    const byLocale = new Map<Locale, string[]>();
    for (const device of devices) {
      const locale = asLocale(device.locale);
      byLocale.set(locale, [...(byLocale.get(locale) ?? []), device.token]);
    }
    const dead: string[] = [];
    for (const [locale, tokens] of byLocale) {
      await primeOverlay(locale);
      const outcome = await sendPush(tokens, {
        title: translateForLocale(TITLE_SONG_READY, locale),
        body: subject
          ? translateTemplateForLocale(BODY_SONG_READY, { title: subject }, locale)
          : translateForLocale(BODY_SONG_READY_NO_TITLE, locale),
        href,
      });
      dead.push(...outcome.invalidTokens);
    }
    await deletePushDevicesByToken(dead);
  } catch (error) {
    logger.error("push song ready failed", { error: error instanceof Error ? error.message : String(error) });
  }
}
