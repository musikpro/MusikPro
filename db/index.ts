import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { assertServerOnlyEnv, requireEnv } from "@/lib/security/env";
import { sql as statement } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

assertServerOnlyEnv();
const sql = neon(requireEnv("DATABASE_URL"));
export const db = drizzle(sql, { schema });

// Only pass an identity obtained from a verified server session. LOCAL settings
// and the query run atomically, so pooled connections cannot leak user context.
export async function userQuery<T extends BatchItem<"pg">>(userId: string, query: T): Promise<T["_"]["result"]> {
  if (!userId || userId.length > 256) throw new Error("Invalid authenticated database identity");
  const result = await db.batch([
    db.execute(
      statement`select set_config('app.user_id', ${userId}, true), set_config('app.organization_id', '', true)`,
    ),
    query,
  ]);
  return result[1];
}

let serviceDatabase: typeof db | undefined;
// Call only inside guarded admin endpoints or trusted server jobs. No fallback
// to the migration/owner connection if the service credential is missing.
export function getServiceDb(): typeof db {
  serviceDatabase ??= drizzle(neon(requireEnv("DATABASE_SERVICE_URL")), {
    schema,
  });
  return serviceDatabase;
}
