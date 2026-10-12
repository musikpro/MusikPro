import { verifyCronRequest } from "@/lib/cron/auth";
import { purgeExpiredGuestLinks } from "@/lib/guest-links/server";
import { createLogger } from "@/lib/observability/logger";
import { purgeExpiredTrashedSongs } from "@/lib/trash/songs";
import { getTrashRetention } from "@/lib/trash/settings";
import { purgeExpiredTrashedUsers } from "@/lib/trash/users";

const logger = createLogger("purge-trash");

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Purge quotidienne de la corbeille du tableau de bord propriétaire : supprime définitivement les chansons, les
 * comptes et les liens du mode invité en corbeille depuis plus longtemps que les délais réglés dans Paramètres > Général (30 jours par défaut).
 */
async function handle(request: Request) {
  if (!verifyCronRequest(request)) return new Response("Unauthorized", { status: 401 });
  const retention = await getTrashRetention();
  const result = { songs: 0, users: 0, guestLinks: 0, errors: 0 };
  try {
    result.songs = await purgeExpiredTrashedSongs(retention.songsRetentionDays);
  } catch (error) {
    result.errors += 1;
    logger.error("Trash songs purge failed", { error: error instanceof Error ? error.message : "unknown" });
  }
  try {
    result.users = await purgeExpiredTrashedUsers(retention.usersRetentionDays);
  } catch (error) {
    result.errors += 1;
    logger.error("Trash users purge failed", { error: error instanceof Error ? error.message : "unknown" });
  }
  try {
    result.guestLinks = await purgeExpiredGuestLinks(retention.guestLinksRetentionDays);
  } catch (error) {
    result.errors += 1;
    logger.error("Trash guest links purge failed", { error: error instanceof Error ? error.message : "unknown" });
  }
  return Response.json({ ...result, retention }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
