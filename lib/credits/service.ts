import "server-only";
import { sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { credits } from "@/db/schema";

/**
 * Atomic single-statement decrement guarded by the balance check itself —
 * a read-then-write here would let two concurrent requests both pass the
 * check and overdraw the balance.
 *
 * Balance writes go through the service connection: the runtime role that carries the
 * customer's RLS identity is deliberately SELECT-only on `credits` (db/migrations/0001_runtime_rls.sql),
 * so a customer-scoped query can never edit its own balance. Callers must only pass a userId taken
 * from a verified server session; every statement is scoped to that single user row.
 */
export async function deductCredits(userId: string, amount: number): Promise<number | null> {
  const result = await getServiceDb().execute(
    sql`UPDATE ${credits} SET balance = balance - ${amount}, updated_at = now() WHERE user_id = ${userId} AND balance >= ${amount} RETURNING balance`,
  );
  const row = result.rows[0] as { balance?: number | string } | undefined;
  return row ? Number(row.balance) : null;
}

export async function refundCredits(userId: string, amount: number): Promise<number | null> {
  const result = await getServiceDb().execute(
    sql`UPDATE ${credits} SET balance = balance + ${amount}, updated_at = now() WHERE user_id = ${userId} RETURNING balance`,
  );
  const row = result.rows[0] as { balance?: number | string } | undefined;
  return row ? Number(row.balance) : null;
}
