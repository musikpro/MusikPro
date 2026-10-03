import { translate as t, translateTemplate } from "@/lib/i18n/translate";

const MAX_CHARS = /^Maximum (\d+) caractères\.$/;
const MAX_WORDS = /^Maximum (\d+) mots\.$/;
const EXACT_DIGITS = /^Saisis exactement (\d+) chiffres pour cet indicatif\.$/;

/**
 * Traduit à l'affichage le message d'une issue Zod. Les messages français des schémas sont marqués par
 * i18nKey(…) (le scanner les met au manifeste) ; ceux avec valeur passent par un modèle.
 */
export function translateIssue(issue: { message: string }): string {
  const max = MAX_CHARS.exec(issue.message);
  if (max) return translateTemplate("Maximum {max} caractères.", { max: max[1] });
  const words = MAX_WORDS.exec(issue.message);
  if (words) return translateTemplate("Maximum {max} mots.", { max: words[1] });
  const digits = EXACT_DIGITS.exec(issue.message);
  if (digits) return translateTemplate("Saisis exactement {digits} chiffres pour cet indicatif.", { digits: digits[1] });
  return t(issue.message);
}
