import "server-only";
import { sql } from "drizzle-orm";
import { db, userQuery } from "@/db";
import { credits } from "@/db/schema";

/**
 * Atomic single-statement decrement guarded by the balance check itself —
 * a read-then-write here would let two concurrent requests both pass the
 * check and overdraw the balance. Runs through the RLS-scoped connection
 * (app.user_id) since this is a user-initiated action, not a service job.
 */
export async function deductCredits(userId: string, amount: number): Promise<number | null> {
  const result = await userQuery(
    userId,
    db.execute(
      sql`UPDATE ${credits} SET balance = balance - ${amount}, updated_at = now() WHERE user_id = ${userId} AND balance >= ${amount} RETURNING balance`,
    ),
  );
  const row = result.rows[0] as { balance?: number | string } | undefined;
  return row ? Number(row.balance) : null;
}

export async function refundCredits(userId: string, amount: number): Promise<number | null> {
  const result = await userQuery(
    userId,
    db.execute(sql`UPDATE ${credits} SET balance = balance + ${amount}, updated_at = now() WHERE user_id = ${userId} RETURNING balance`),
  );
  const row = result.rows[0] as { balance?: number | string } | undefined;
  return row ? Number(row.balance) : null;
}
