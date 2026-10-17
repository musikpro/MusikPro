import "server-only";

import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { getServiceDb } from "@/db";
import { metaCapiSettings } from "@/db/schema";
import { encryptSecret, tryDecryptSecret } from "@/lib/ai/secrets";

export const META_CAPI_CACHE_TAG = "meta-capi";

export type MetaCapiStatus = {
  enabled: boolean;
  pixelId: string | null;
  testEventCode: string | null;
  hasToken: boolean;
  tokenLast4: string | null;
  updatedAt: Date | null;
};

async function readRow() {
  const [row] = await getServiceDb().select().from(metaCapiSettings).where(eq(metaCapiSettings.id, "global")).limit(1);
  return row ?? null;
}

/** État affiché dans l'administration : le token lui-même n'est jamais renvoyé, seulement ses 4 derniers caractères. */
export async function getMetaCapiStatus(): Promise<MetaCapiStatus> {
  const row = await readRow();
  return {
    enabled: row?.enabled ?? false,
    pixelId: row?.pixelId ?? null,
    testEventCode: row?.testEventCode ?? null,
    hasToken: Boolean(row?.tokenCiphertext),
    tokenLast4: row?.tokenLast4 ?? null,
    updatedAt: row?.updatedAt ?? null,
  };
}

/**
 * Indique au layout racine s'il faut charger la balise navigateur. Valeur non secrète, mise en cache jusqu'à la
 * prochaine modification ; base injoignable ou migration absente = désactivé.
 */
export async function isMetaCapiActive(): Promise<boolean> {
  try {
    return await unstable_cache(
      async () => {
        const row = await readRow();
        return Boolean(row?.enabled && row.pixelId && row.tokenCiphertext);
      },
      ["meta-capi-active"],
      { tags: [META_CAPI_CACHE_TAG], revalidate: 3600 },
    )();
  } catch {
    return false;
  }
}

export type MetaCapiCredentials = { pixelId: string; token: string; testEventCode: string | null };

/** Identifiants déchiffrés (usage serveur uniquement) ; `undefined` si non configuré ou token illisible. */
export async function readMetaCapiCredentials(options: {
  requireEnabled: boolean;
}): Promise<MetaCapiCredentials | undefined> {
  const row = await readRow();
  if (!row?.pixelId || !row.tokenCiphertext || !row.tokenIv || !row.tokenAuthTag) return undefined;
  if (options.requireEnabled && !row.enabled) return undefined;
  const token = tryDecryptSecret({ ciphertext: row.tokenCiphertext, iv: row.tokenIv, authTag: row.tokenAuthTag });
  if (!token) return undefined;
  return { pixelId: row.pixelId, token, testEventCode: row.testEventCode };
}

// Les événements arrivent à chaque page vue : on évite une lecture + un déchiffrement par requête (mémoire du processus, jamais persistée).
let memo: { at: number; value: MetaCapiCredentials | undefined } | null = null;
const MEMO_MS = 30_000;
export async function getMetaCapiCredentialsForEvents(): Promise<MetaCapiCredentials | undefined> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.value;
  const value = await readMetaCapiCredentials({ requireEnabled: true });
  memo = { at: Date.now(), value };
  return value;
}
export function resetMetaCapiMemo() {
  memo = null;
}

export async function saveMetaCapiSettings(input: {
  enabled: boolean;
  pixelId: string | null;
  token: string | null;
  testEventCode: string | null;
  actorId: string;
}): Promise<{ hasToken: boolean }> {
  const current = await readRow();
  const secret = input.token ? encryptSecret(input.token) : null;
  const hasToken = Boolean(secret || current?.tokenCiphertext);
  if (input.enabled && (!input.pixelId || !hasToken)) {
    throw new Error("Renseigne l'ID du pixel et le token d'accès avant d'activer l'API Conversions.");
  }
  const now = new Date();
  const fields = {
    enabled: input.enabled,
    pixelId: input.pixelId,
    testEventCode: input.testEventCode,
    ...(secret
      ? {
          tokenCiphertext: secret.ciphertext,
          tokenIv: secret.iv,
          tokenAuthTag: secret.authTag,
          tokenLast4: input.token!.slice(-4),
        }
      : {}),
    updatedBy: input.actorId,
    updatedAt: now,
  };
  await getServiceDb()
    .insert(metaCapiSettings)
    .values({ id: "global", ...fields })
    .onConflictDoUpdate({ target: metaCapiSettings.id, set: fields });
  resetMetaCapiMemo();
  return { hasToken };
}

export async function removeMetaCapiToken(actorId: string): Promise<void> {
  await getServiceDb()
    .insert(metaCapiSettings)
    .values({ id: "global", enabled: false })
    .onConflictDoUpdate({
      target: metaCapiSettings.id,
      set: {
        enabled: false,
        tokenCiphertext: null,
        tokenIv: null,
        tokenAuthTag: null,
        tokenLast4: null,
        updatedBy: actorId,
        updatedAt: new Date(),
      },
    });
  resetMetaCapiMemo();
}
