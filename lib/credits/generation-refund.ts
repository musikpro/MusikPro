import "server-only";
import { sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs } from "@/db/schema";
import { writeAuditLog } from "@/lib/security/audit";

/**
 * Remboursement automatique d'une génération qui a échoué.
 *
 * Les crédits sont débités au lancement (route /api/songs/generate). Ils sont enregistrés sur UNE version du
 * groupe (`credits_charged`) une fois la génération réellement partie chez le fournisseur. Si toutes les versions
 * finissent en échec (rejet du fournisseur, tâche en erreur, délai dépassé), les crédits sont rendus, une seule fois.
 */

/** Enregistre le montant débité sur la première version du groupe (aucun montant : génération offerte/admin). */
export async function recordSongGroupCharge(userId: string, songGroupId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await getServiceDb().execute(sql`
    UPDATE ${musicGenerationJobs}
    SET credits_charged = ${amount}
    WHERE id = (
      SELECT id FROM ${musicGenerationJobs}
      WHERE user_id = ${userId} AND song_group_id = ${songGroupId}
      ORDER BY version_label ASC, created_at ASC
      LIMIT 1
    )`);
}

/**
 * Rend les crédits d'un groupe dont TOUTES les versions sont en échec. Une seule instruction SQL atomique :
 * marque le groupe comme remboursé (si ce n'est pas déjà fait) et crédite le solde, de sorte que deux appels
 * simultanés ne remboursent jamais deux fois et qu'un échec à mi-chemin ne perd pas le remboursement.
 * Retourne le nombre de crédits rendus (0 si rien à rembourser).
 */
export async function refundSongGroupIfFailed(userId: string, songGroupId: string | null | undefined): Promise<number> {
  if (!songGroupId) return 0;
  const result = await getServiceDb().execute(sql`
    WITH marked AS (
      UPDATE ${musicGenerationJobs}
      SET credits_refunded_at = now()
      WHERE user_id = ${userId}
        AND song_group_id = ${songGroupId}
        AND credits_charged > 0
        AND credits_refunded_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM ${musicGenerationJobs} other
          WHERE other.user_id = ${userId}
            AND other.song_group_id = ${songGroupId}
            AND other.status NOT IN ('failed', 'cancelled')
        )
      RETURNING credits_charged
    ),
    refunded AS (
      UPDATE credits
      SET balance = balance + (SELECT COALESCE(SUM(credits_charged), 0) FROM marked), updated_at = now()
      WHERE user_id = ${userId} AND EXISTS (SELECT 1 FROM marked)
      RETURNING 1
    )
    SELECT COALESCE((SELECT SUM(credits_charged) FROM marked), 0) AS refunded`);
  const refunded = Number((result.rows[0] as { refunded?: number | string } | undefined)?.refunded ?? 0);
  if (refunded > 0) {
    await writeAuditLog({
      action: "credits.generation_failed_refund",
      actorId: userId,
      targetType: "song_group",
      targetId: songGroupId,
      metadata: { credits: refunded },
    });
  }
  return refunded;
}
