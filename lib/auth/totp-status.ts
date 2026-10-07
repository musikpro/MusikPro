import { eq } from "drizzle-orm";
import { db } from "@/db";
import { twoFactor } from "@/db/schema";

// Même connexion que Better Auth (rôle d'exécution) : le rôle de service n'a aucun droit sur `two_factor`, et une
// erreur d'accès renverrait « non lié » en boucle même après un enregistrement réussi.
/** Une application d'authentification est-elle enregistrée et vérifiée pour ce compte ? */
export async function hasVerifiedTotp(userId: string) {
  try {
    const [row] = await db
      .select({ id: twoFactor.id, verified: twoFactor.verified })
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .limit(1);
    return Boolean(row && row.verified !== false);
  } catch {
    return false;
  }
}
