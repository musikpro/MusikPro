import { translate as t } from "@/lib/i18n/translate";
import type { AnswerErrorCode } from "@/lib/occasion-fields/answers";

/** Appels littéraux de `t` : le scanner i18n:sync ne voit pas `t(variable)`. */
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
