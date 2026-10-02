import { translate as t } from "@/lib/i18n/translate";
import type { AnswerErrorCode } from "./answers";

export type BlockVisibility = { showRecipient: boolean; showSender: boolean };

export function blockVisibility(
  occasion: { showRecipient?: boolean; showSender?: boolean } | undefined,
): BlockVisibility {
  return { showRecipient: occasion?.showRecipient ?? true, showSender: occasion?.showSender ?? true };
}

/** Évite d'envoyer à la génération un nom saisi pour une occasion précédente dont le bloc est maintenant masqué. */
export function clearHiddenBlockValues(
  visibility: BlockVisibility,
  current: { fields: Record<string, string>; choices: Record<string, string> },
): { fields: Record<string, string>; choices: Record<string, string> } {
  const fields = { ...current.fields };
  const choices = { ...current.choices };
  if (!visibility.showRecipient) {
    fields.recipientName = "";
    fields.recipientPronunciation = "";
    choices.recipientRelation = "";
  }
  if (!visibility.showSender) {
    fields.senderName = "";
    fields.senderPronunciation = "";
  }
  return { fields, choices };
}

/** Appels `t("…")` littéraux : le scanner i18n:sync ne voit pas `t(variable)`. */
export function answerErrorText(code: AnswerErrorCode): string {
  switch (code) {
    case "required":
      return t("Ce champ est obligatoire.");
    case "option":
      return t("Choisis une option proposée.");
    case "number":
      return t("Entre un nombre entier valide.");
    case "range":
      return t("La valeur est hors des limites autorisées.");
    case "date":
      return t("Entre une date valide.");
    case "length":
      return t("Le texte est trop long.");
    case "duplicate":
      return t("Une réponse est en double.");
    case "unknown":
      return t("Un champ ne correspond plus à cette occasion. Recharge la page.");
  }
}
