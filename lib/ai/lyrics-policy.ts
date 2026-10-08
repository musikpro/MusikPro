export const LYRICS_MAX_WORDS = 450;
export const LYRICS_MAX_DURATION_SECONDS = 4 * 60;

/**
 * Musicful sings the lyrics exactly as written, so a word the voice model has never seen — a town
 * such as Boundiali, a local surname, a word from an African language — gets read as if it were
 * French or English and comes out mispronounced. The customer-facing "prononciation suggérée"
 * already solves this for the recipient/sender names by writing them as hyphen-separated
 * syllables (Aïcha -> Aï-cha); this rule extends the exact same convention to every other word
 * of that kind, so the lyrics themselves carry the syllable split the voice needs. Single source
 * of truth: injected into the system instructions AND every user prompt (generate / extend /
 * rewrite) so a rewrite never undoes a split made earlier.
 */
export const UNKNOWN_WORDS_PRONUNCIATION_RULE =
  "Règle de prononciation des mots inconnus (obligatoire) : tout mot qui n'appartient pas au vocabulaire courant du français, de l'anglais, de l'espagnol ou du portugais — nom de ville, de village ou de quartier (par exemple Boundiali), nom de lieu, nom de famille, prénom local, mot d'une langue africaine ou de toute autre langue — doit apparaître dans les paroles découpé en syllabes séparées par des tirets, exactement comme pour une prononciation suggérée (exemples : Aïcha -> Aï-cha, Boundiali -> Boun-dia-li), afin que la voix le prononce correctement. Tu coupes seulement le mot : garde exactement les mêmes lettres, n'en ajoute pas, n'en remplace pas et n'en supprime pas. Découpe selon les syllabes réellement prononcées (deux voyelles qui se prononcent ensemble, comme « ia » ou « ou », restent dans la même syllabe). Applique ce découpage à CHAQUE occurrence du mot, y compris dans un nom composé (par exemple A-wa-I-ssa), avec la même écriture partout dans la chanson, garde la majuscule initiale, et ne découpe jamais un mot courant ni un mot que tu connais dans ces quatre langues. Pour le destinataire et l'expéditeur, recopie EXACTEMENT, caractère par caractère, la prononciation fournie (par exemple I-ssa reste I-ssa, jamais Is-sa) : cette règle de découpage ne s'applique pas à eux et ne doit jamais la modifier. Les découpages déjà présents dans des paroles existantes doivent être conservés.";
const ESTIMATED_SUNG_WORDS_PER_MINUTE = 150;

export function countLyricsWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * The model sometimes returns Markdown despite being told not to ("# Titre", "**[Couplet 1]**").
 * Customers see this text as-is and it is also sent to the audio engine, so strip the Markdown
 * syntax but keep the plain "[Couplet 1]" section tags and every sung line untouched.
 */
export function stripLyricsMarkdown(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*(```|~~~)/.test(line))
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, "")
        .replace(/(\*\*|__)(.+?)\1/g, "$2")
        .replace(/^\s*[-*]\s+(?=\S)/, "")
        .trimEnd(),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Le modèle écrit parfois une première ligne d'étiquette (« Paroles : Titre », « Lyrics: … », « Titre : … ») : elle n'est
 * pas chantée et le moteur audio pourrait la lire. Seule cette première ligne étiquetée est retirée ; un titre sans
 * étiquette et toutes les lignes chantées restent intacts.
 */
export function stripLyricsTitleLine(text: string) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const first = lines.findIndex((line) => line.trim() !== "");
  if (first < 0) return text.trim();
  if (!/^\s*(?:paroles?(?:\s+de\s+(?:la\s+)?chanson)?|lyrics?|titre|title)\s*[:：]/i.test(lines[first])) return text.trim();
  return lines
    .slice(first + 1)
    .join("\n")
    .replace(/^\n+/, "")
    .trim();
}

export function enforceLyricsWordLimit(text: string, limit = LYRICS_MAX_WORDS) {
  const trimmed = text.trim();
  const matches = [...trimmed.matchAll(/\S+/g)];
  if (matches.length <= limit) return trimmed;
  const lastWord = matches[limit - 1];
  return trimmed.slice(0, (lastWord.index ?? 0) + lastWord[0].length).trimEnd();
}

export function estimateLyricsDurationSeconds(wordCount: number) {
  if (wordCount <= 0) return 0;
  return Math.min(
    LYRICS_MAX_DURATION_SECONDS,
    Math.max(1, Math.ceil((wordCount / ESTIMATED_SUNG_WORDS_PER_MINUTE) * 60)),
  );
}

export function formatLyricsDuration(seconds: number) {
  const bounded = Math.min(LYRICS_MAX_DURATION_SECONDS, Math.max(0, Math.round(seconds)));
  const minutes = Math.floor(bounded / 60);
  const remainingSeconds = bounded % 60;
  return `~${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
