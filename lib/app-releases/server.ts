import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { del, get } from "@vercel/blob";
import { desc, eq, sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { appReleases } from "@/db/schema";
import { createLogger } from "@/lib/observability/logger";
import { inspectApk } from "./apk";
import { ANDROID_BLOB_PREFIX, MAX_APK_BYTES, type AppPlatform } from "./constants";
import type { RegisterAppReleaseInput } from "@/lib/validation/app-releases";

const logger = createLogger("app-releases");

/** Erreur dont le message est destiné à l'administrateur (affiché dans la notification). */
export class AppReleaseError extends Error {}

export type AppReleaseView = {
  id: string;
  platform: string;
  version: string;
  build: number;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  notes: string | null;
  published: boolean;
  downloads: number;
  createdAt: Date;
  publishedAt: Date | null;
};

const viewColumns = {
  id: appReleases.id,
  platform: appReleases.platform,
  version: appReleases.version,
  build: appReleases.build,
  fileName: appReleases.fileName,
  sizeBytes: appReleases.sizeBytes,
  sha256: appReleases.sha256,
  notes: appReleases.notes,
  published: appReleases.published,
  downloads: appReleases.downloads,
  createdAt: appReleases.createdAt,
  publishedAt: appReleases.publishedAt,
};

/** Le stockage privé est configuré (jeton lecture/écriture ou identifiant de store avec OIDC). */
export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export async function listAppReleases(platform: AppPlatform): Promise<AppReleaseView[]> {
  return getServiceDb()
    .select(viewColumns)
    .from(appReleases)
    .where(eq(appReleases.platform, platform))
    .orderBy(desc(appReleases.build));
}

/** La version publiée (celle que reçoit le logo Google Play du site), ou null. Tolérante : table absente = aucune. */
export async function getPublishedRelease(platform: AppPlatform): Promise<AppReleaseView | null> {
  try {
    const [row] = await getServiceDb()
      .select(viewColumns)
      .from(appReleases)
      .where(sql`${appReleases.platform} = ${platform} and ${appReleases.published}`)
      .limit(1);
    return row ?? null;
  } catch (error) {
    logger.error("published release read failed", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/** Lit un fichier du stockage privé en mémoire, en refusant tout ce qui dépasse la taille maximale. */
async function readBlob(pathname: string): Promise<Buffer> {
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) throw new AppReleaseError("Le fichier envoyé est introuvable.");
  if (result.blob.size > MAX_APK_BYTES) throw new AppReleaseError("Le fichier dépasse la taille maximale de 35 Mo.");
  const chunks: Uint8Array[] = [];
  let received = 0;
  const reader = result.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_APK_BYTES) {
      await reader.cancel();
      throw new AppReleaseError("Le fichier dépasse la taille maximale de 35 Mo.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function discardBlob(pathname: string): Promise<void> {
  try {
    await del(pathname);
  } catch (error) {
    logger.error("blob cleanup failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Enregistre un fichier déjà envoyé au stockage privé : le serveur le relit, vérifie que c'est bien un APK signé de
 * MusikPro (jamais confiance au navigateur), calcule son empreinte SHA-256 puis crée la version (non publiée). En cas
 * de refus, le fichier est supprimé du stockage.
 */
export async function registerAppRelease(input: RegisterAppReleaseInput, userId: string): Promise<AppReleaseView> {
  if (!input.pathname.startsWith(ANDROID_BLOB_PREFIX)) throw new AppReleaseError("Chemin de fichier invalide.");
  try {
    const database = getServiceDb();
    const [latest] = await database
      .select({ build: appReleases.build })
      .from(appReleases)
      .where(eq(appReleases.platform, "android"))
      .orderBy(desc(appReleases.build))
      .limit(1);
    if (latest && input.build <= latest.build) {
      throw new AppReleaseError(
        `Le numéro de build doit être supérieur au dernier envoi (${latest.build}) : Android refuse sinon la mise à jour.`,
      );
    }
    const buffer = await readBlob(input.pathname);
    const inspection = inspectApk(buffer);
    if (!inspection.ok) throw new AppReleaseError(inspection.reason);

    const [row] = await database
      .insert(appReleases)
      .values({
        id: randomUUID(),
        platform: "android",
        version: input.version,
        build: input.build,
        fileName: `MusikPro-${input.version}.apk`,
        sizeBytes: buffer.length,
        sha256: createHash("sha256").update(buffer).digest("hex"),
        blobPathname: input.pathname,
        notes: input.notes,
        createdBy: userId,
      })
      .returning(viewColumns);
    return row;
  } catch (error) {
    await discardBlob(input.pathname);
    if (error instanceof AppReleaseError) throw error;
    logger.error("release register failed", { error: error instanceof Error ? error.message : String(error) });
    throw new AppReleaseError("L'enregistrement de la version a échoué.");
  }
}

/** Publie une version (et dépublie les autres de la plateforme) ou la dépublie. Atomique. */
export async function setReleasePublished(id: string, published: boolean): Promise<AppReleaseView> {
  const database = getServiceDb();
  const [target] = await database.select(viewColumns).from(appReleases).where(eq(appReleases.id, id)).limit(1);
  if (!target) throw new AppReleaseError("Version introuvable.");
  const now = new Date();
  await database.batch([
    database.update(appReleases).set({ published: false }).where(eq(appReleases.platform, target.platform)),
    ...(published
      ? [database.update(appReleases).set({ published: true, publishedAt: now }).where(eq(appReleases.id, id))]
      : []),
  ]);
  return { ...target, published, publishedAt: published ? now : target.publishedAt };
}

/** Supprime une version non publiée et son fichier. */
export async function deleteRelease(id: string): Promise<AppReleaseView> {
  const database = getServiceDb();
  const [target] = await database
    .select({ ...viewColumns, blobPathname: appReleases.blobPathname })
    .from(appReleases)
    .where(eq(appReleases.id, id))
    .limit(1);
  if (!target) throw new AppReleaseError("Version introuvable.");
  if (target.published) throw new AppReleaseError("Dépublie d'abord cette version avant de la supprimer.");
  await database.delete(appReleases).where(eq(appReleases.id, id));
  await discardBlob(target.blobPathname);
  return target;
}

/** Fichier de la version publiée prêt à être servi (flux), ou null. */
export async function openPublishedRelease(platform: AppPlatform) {
  const [row] = await getServiceDb()
    .select({ ...viewColumns, blobPathname: appReleases.blobPathname })
    .from(appReleases)
    .where(sql`${appReleases.platform} = ${platform} and ${appReleases.published}`)
    .limit(1);
  if (!row) return null;
  const result = await get(row.blobPathname, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  return { release: row, stream: result.stream, size: result.blob.size };
}

/** Compte un téléchargement (agrégat, aucune donnée personnelle). Ne lève jamais. */
export async function countDownload(id: string): Promise<void> {
  try {
    await getServiceDb()
      .update(appReleases)
      .set({ downloads: sql`${appReleases.downloads} + 1` })
      .where(eq(appReleases.id, id));
  } catch (error) {
    logger.error("download count failed", { error: error instanceof Error ? error.message : String(error) });
  }
}
