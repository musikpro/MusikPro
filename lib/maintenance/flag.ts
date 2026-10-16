import { neon } from "@neondatabase/serverless";

/**
 * Lecture légère du mode maintenance pour proxy.ts, qui s'exécute à CHAQUE requête : une seule requête SQL
 * brute (pas de schéma Drizzle dans le bundle du proxy), mise en cache 5 s par instance, avec un délai maximal
 * court. Échec OUVERT : si la base ne répond pas, le site reste accessible (on garde la dernière valeur connue).
 * Le cache n'est pas partagé avec les Server Actions : une bascule prend donc effet en 5 s au plus.
 */
const CACHE_TTL_MS = 5_000;
const ERROR_RETRY_MS = 1_000;
const QUERY_TIMEOUT_MS = 1_500;

type Cached = { value: boolean; expiresAt: number };

let cached: Cached | null = null;
let client: ReturnType<typeof neon> | undefined;

async function readFlag(url: string): Promise<boolean> {
  client ??= neon(url);
  const query = client.query("select enabled from maintenance_settings where id = 'global' limit 1") as Promise<
    Array<{ enabled?: boolean }>
  >;
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("maintenance flag timeout")), QUERY_TIMEOUT_MS),
  );
  const rows = await Promise.race([query, timeout]);
  return rows[0]?.enabled === true;
}

export async function isMaintenanceActive(now: number = Date.now()): Promise<boolean> {
  if (cached && now < cached.expiresAt) return cached.value;
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  try {
    const value = await readFlag(url);
    cached = { value, expiresAt: now + CACHE_TTL_MS };
    return value;
  } catch {
    const value = cached?.value ?? false;
    cached = { value, expiresAt: now + ERROR_RETRY_MS };
    return value;
  }
}
