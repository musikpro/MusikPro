import { getPronunciation } from "./engine";

const LOCALE = "fr-CI";

/**
 * Prononciation d'un nom saisi, calculée localement ; chaîne vide si le nom est vide. Les prononciations envoyées
 * par le navigateur ne sont jamais une source de vérité : le serveur les remplace par ce calcul.
 */
export function serverPronunciation(name: string | undefined): string {
  const trimmed = (name ?? "").trim();
  return trimmed ? getPronunciation(trimmed, { locale: LOCALE }).pronunciation : "";
}
