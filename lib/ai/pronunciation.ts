import "server-only";
import { getPronunciation } from "@/lib/phonetics-offline/engine";

/**
 * Suggestion de prononciation 100 % locale (dictionnaire franco-africain + règles) : aucun appel au fournisseur IA,
 * aucune clé, aucun coût. La route reste disponible pour la rétrocompatibilité du contrat `/api/ai/pronunciation`.
 */
export function suggestPronunciation(name: string) {
  const result = getPronunciation(name, { locale: "fr-CI" });
  return {
    pronunciation: result.pronunciation,
    source: result.source,
    confidence: result.confidence,
    needsReview: result.needsReview,
    model: "local" as const,
    provider: "local" as const,
  };
}
