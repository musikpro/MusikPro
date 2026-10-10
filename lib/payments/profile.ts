import "server-only";

import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { paymentProfiles } from "@/db/schema";

export type PaymentProfile = { phoneLocal: string; phoneCountry: string };

/** Numéro de paiement mémorisé du compte, ou null (jamais d'erreur : l'absence de la table ne doit pas bloquer le tableau de bord). */
export async function getPaymentProfile(userId: string): Promise<PaymentProfile | null> {
  try {
    const [row] = await getServiceDb()
      .select({ phoneLocal: paymentProfiles.phoneLocal, phoneCountry: paymentProfiles.phoneCountry })
      .from(paymentProfiles)
      .where(eq(paymentProfiles.userId, userId))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

/** Mémorise le numéro utilisé pour un paiement : proposé d'office aux prochains achats. Meilleur effort, n'interrompt jamais le paiement. */
export async function savePaymentProfile(userId: string, profile: PaymentProfile): Promise<void> {
  try {
    await getServiceDb()
      .insert(paymentProfiles)
      .values({ userId, ...profile })
      .onConflictDoUpdate({ target: paymentProfiles.userId, set: { ...profile, updatedAt: new Date() } });
  } catch {
    // Mémoriser le numéro est un confort : un échec ne doit pas faire échouer le paiement.
  }
}
