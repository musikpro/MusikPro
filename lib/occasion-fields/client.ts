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
