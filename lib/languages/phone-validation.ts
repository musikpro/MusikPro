export type FieldCheck = { state: "empty" | "valid" | "invalid"; message: string };

/** Indicatif : « + » puis 1 à 4 chiffres (même règle que l'enregistrement côté serveur). */
export function checkDialCode(value: string): FieldCheck {
  const text = value.trim();
  if (!text) return { state: "empty", message: "" };
  return /^\+\d{1,4}$/.test(text)
    ? { state: "valid", message: "Indicatif valide." }
    : { state: "invalid", message: "Format attendu : + suivi de 1 à 4 chiffres (ex. +225)." };
}

/** Chiffres attendus : entier de 6 à 12 (même règle que l'enregistrement côté serveur). */
export function checkDigits(value: string): FieldCheck {
  const text = value.trim();
  if (!text) return { state: "empty", message: "" };
  const count = Number(text);
  return /^\d+$/.test(text) && Number.isInteger(count) && count >= 6 && count <= 12
    ? { state: "valid", message: "Nombre de chiffres valide." }
    : { state: "invalid", message: "Un nombre entier entre 6 et 12." };
}

/** Exemple : uniquement des chiffres, et exactement autant que « Chiffres attendus » lorsque celui-ci est valide. */
export function checkExample(value: string, digits: string): FieldCheck {
  const text = value.trim();
  if (!text) return { state: "empty", message: "" };
  if (!/^\d+$/.test(text)) return { state: "invalid", message: "Chiffres uniquement, sans espace ni signe." };
  const expected = checkDigits(digits).state === "valid" ? Number(digits) : null;
  if (expected !== null && text.length !== expected) {
    return {
      state: "invalid",
      message: `L’exemple compte ${text.length} chiffre${text.length > 1 ? "s" : ""} au lieu de ${expected}.`,
    };
  }
  return { state: "valid", message: "Exemple cohérent avec le nombre de chiffres." };
}
