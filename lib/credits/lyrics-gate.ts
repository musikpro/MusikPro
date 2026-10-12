import "server-only";
import { eq } from "drizzle-orm";
import { db, userQuery } from "@/db";
import { credits } from "@/db/schema";
import { hasAppRole } from "@/lib/auth/permissions";
import { CREDITS_PER_GENERATION } from "@/lib/credit-plans/catalog";
import { isPaymentBypassEnabled } from "@/lib/settings/payment-bypass";

/**
 * Les paroles sont facturées par le fournisseur IA : un compte doit déjà détenir de quoi payer la chanson
 * (CREDITS_PER_GENERATION) avant d'en générer. Rien n'est débité ici — les crédits ne sont consommés qu'à la
 * génération musicale. Le propriétaire avec le contournement de paiement actif passe sans solde.
 */
export async function hasCreditsForLyrics(userId: string, role: string | undefined): Promise<boolean> {
  if (hasAppRole(role, "admin") && (await isPaymentBypassEnabled())) return true;
  const [row] = await userQuery(
    userId,
    db.select({ balance: credits.balance }).from(credits).where(eq(credits.userId, userId)).limit(1),
  );
  return Number(row?.balance ?? 0) >= CREDITS_PER_GENERATION;
}
