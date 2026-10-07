import { eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { twoFactor } from "@/db/schema";

/** Une application d'authentification est-elle enregistrée et vérifiée pour ce compte ? */
export async function hasVerifiedTotp(userId: string) {
  try {
    const [row] = await getServiceDb()
      .select({ id: twoFactor.id, verified: twoFactor.verified })
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .limit(1);
    return Boolean(row && row.verified !== false);
  } catch {
    return false;
  }
}
