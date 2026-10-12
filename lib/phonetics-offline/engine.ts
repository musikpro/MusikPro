import { BUILTIN_NAMES, type DictionaryEntry } from "./dictionary";

/**
 * Résolution 100 % locale, synchrone et déterministe.
 * Pas de LLM, TTS, fetch, HTTP, ni dépendance tierce.
 * Le champ client est en lecture seule; les corrections ne viennent que du propriétaire.
 */
export type Confidence = "high" | "low" | "unknown";
export type PhoneticSource = "approved-override" | "dictionary" | "analogy" | "rules" | "mixed" | "unresolved";
export type ApprovedOverride = {
  name: string;
  pronunciation: string;
  locale?: string;
  /** La validation est établie côté serveur par une autorisation propriétaire. */
  approved: true;
  ipa?: string;
};
export type PronunciationResult = {
  name: string;
  pronunciation: string;
  syllables: string[];
  locale: string;
  source: PhoneticSource;
  confidence: Confidence;
  needsReview: boolean;
  ipa?: string;
};
export type LookupOptions = {
  locale?: string;
  /** Passer uniquement des entrées propriétaires vérifiées côté serveur. */
  approvedOverrides?: readonly ApprovedOverride[];
};
export type MusicfulPreparationOptions = LookupOptions & {
  /**
   * - use-local-rules : phonétise aussi les noms non trouvés, si estimation exploitable.
   * - keep-original : ne substitue que les entrées connues/approuvées.
   * Le propriétaire choisit la politique; le client ne peut pas la changer.
   */
  unknownNamePolicy?: "use-local-rules" | "keep-original";
};

const DEFAULT_LOCALE = "fr-CI";
const NAME_PATTERN = /^[\p{L}\p{M}'’ -]+$/u;
const VOWEL_PATTERN = /[aeiouyàâäæéèêëîïôöœùûüÿ]/i;
const NUCLEI = /^(?:eau|œu|oeu|ou|oi|au|ai|ei|eu|ui|ie|ia|[aeiouyàâäæéèêëîïôöœùûüÿ])$/i;
const LETTER_UNITS = /eau|œu|oeu|ou|oi|au|ai|ei|eu|ui|ie|ia|ch|gn|ph|th|qu|dj|[\p{L}\p{M}]/giu;
const LEGAL_ONSETS = new Set(["br", "bl", "tr", "dr", "cr", "cl", "gr", "gl", "fr", "fl", "pr", "pl", "vr", "vl"]);

/** Normalisation de recherche uniquement (ne jamais écraser le nom d'origine). */
export function normalizedName(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/[’‘ʻ]/g, "'")
    .replace(/\s+/gu, " ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr");
}

function safeName(name: string): boolean {
  return name.length > 0 && name.length <= 120 && NAME_PATTERN.test(name);
}

const baseIndex = new Map<string, DictionaryEntry>();
for (const entry of BUILTIN_NAMES) {
  const key = normalizedName(entry.name);
  if (!baseIndex.has(key)) baseIndex.set(key, entry);
}

type AnalogyReference = { normalized: string; boundaries: readonly number[] };
/** Apprendre des positions de césures à partir des exemples existants. */
const analogyExamples: readonly AnalogyReference[] = [...baseIndex.values()].flatMap((entry) => {
  // Ne récupérer que les propositions à graphie identique à la source,
  // pas les variantes dont la graphie transforme réellement les sons.
  const raw = entry.name;
  if (!/^[\p{L}\p{M}]+$/u.test(raw)) return [];
  const pronunciation = entry.pronunciation;
  if (normalizedName(pronunciation.replace(/-/gu, "")) !== normalizedName(raw)) return [];
  const syllables = pronunciation.split("-");
  if (syllables.length < 2) return [];
  const key = normalizedName(raw);
  if (key.length < 5 || key.length > 32) return [];
  let at = 0;
  const boundaries: number[] = [];
  for (const part of syllables.slice(0, -1)) {
    at += normalizedName(part).length;
    boundaries.push(at);
  }
  return [{ normalized: key, boundaries }];
});

function isVowel(char: string): boolean {
  return VOWEL_PATTERN.test(char);
}
/** Une substitution isolée, sans changement voyelle ↔ consonne. */
function analogySyllabify(word: string): string | null {
  const key = normalizedName(word);
  if (!/^[a-z]+$/u.test(key) || key.length < 5 || key.length > 32) return null;
  const candidates = new Map<string, number>();
  for (const sample of analogyExamples) {
    if (sample.normalized.length !== key.length) continue;
    let differences = 0;
    let compatible = true;
    for (let i = 0; i < key.length; i++) {
      if (sample.normalized[i] === key[i]) continue;
      differences++;
      if (differences > 1 || isVowel(sample.normalized[i]) !== isVowel(key[i])) {
        compatible = false;
        break;
      }
    }
    if (!compatible || differences !== 1) continue;
    const signature = sample.boundaries.join(",");
    candidates.set(signature, (candidates.get(signature) || 0) + 1);
  }
  // En cas de plusieurs propositions divergentes, éviter l'analogie arbitraire.
  if (candidates.size !== 1) return null;
  const signature = candidates.keys().next().value;
  if (!signature) return null;
  const boundaries = signature.split(",").map(Number);
  const letters = [...word];
  if (letters.length !== key.length) return null;
  const chunks: string[] = [];
  let start = 0;
  for (const at of boundaries) {
    if (at <= start || at >= letters.length) return null;
    chunks.push(letters.slice(start, at).join(""));
    start = at;
  }
  chunks.push(letters.slice(start).join(""));
  return chunks.join("-");
}

function isNucleus(unit: string): boolean {
  return NUCLEI.test(unit);
}
function localSyllabifyWord(word: string): string | null {
  const units = word.match(LETTER_UNITS);
  if (!units || units.join("") !== word || !VOWEL_PATTERN.test(word)) return null;
  const vowels = units.flatMap((unit, i) => (isNucleus(unit) ? [i] : []));
  if (vowels.length < 2) return word;
  const breaks: number[] = [];
  for (let v = 0; v < vowels.length - 1; v++) {
    const first = vowels[v],
      second = vowels[v + 1];
    const between = units.slice(first + 1, second);
    let boundary = second;
    if (between.length > 1) {
      const possibleOnset = between.slice(-2).join("").toLowerCase();
      boundary = LEGAL_ONSETS.has(possibleOnset) ? second - 2 : second - 1;
    } else if (between.length === 1) {
      boundary = second - 1;
    }
    breaks.push(boundary);
  }
  const pieces: string[] = [];
  let start = 0;
  for (const point of breaks) {
    if (point > start) pieces.push(units.slice(start, point).join(""));
    start = point;
  }
  pieces.push(units.slice(start).join(""));
  return pieces.filter(Boolean).join("-");
}

function toResult(
  name: string,
  locale: string,
  pronunciation: string,
  source: PhoneticSource,
  confidence: Confidence,
  ipa?: string,
): PronunciationResult {
  return {
    name,
    locale,
    pronunciation,
    syllables: pronunciation
      .split(/[-\s]+/)
      .map((x) => x.trim())
      .filter(Boolean),
    source,
    confidence,
    needsReview: confidence !== "high",
    ...(ipa ? { ipa } : {}),
  };
}

/** Résout UNE entrée du dictionnaire, une analogie ou une règle syllabique. */
function getOne(name: string, options: LookupOptions, locale: string): PronunciationResult {
  const key = normalizedName(name);
  const override = options.approvedOverrides?.find(
    (entry) =>
      entry.approved === true &&
      normalizedName(entry.name) === key &&
      (entry.locale === locale || (entry.locale === undefined && locale === DEFAULT_LOCALE)),
  );
  if (override && safeName(override.pronunciation) && override.pronunciation.length <= 180) {
    return toResult(name, locale, override.pronunciation, "approved-override", "high", override.ipa);
  }
  // Lexique franco-africain valable pour toutes les locales francophones ;
  // ne pas en déduire que le nom ou la personne est de nationalité française.
  if (locale.toLowerCase() === "fr" || locale.toLowerCase().startsWith("fr-")) {
    const known = baseIndex.get(key);
    if (known) return toResult(name, locale, known.pronunciation, "dictionary", "high", known.ipa);
    const analogous = analogySyllabify(name);
    if (analogous) return toResult(name, locale, analogous, "analogy", "low");
  }
  const guessed = localSyllabifyWord(name);
  if (guessed) return toResult(name, locale, guessed, "rules", "low");
  return toResult(name, locale, name, "unresolved", "unknown");
}

/** Composition de résultats locaux sans rendre une estimation artificiellement fiable. */
function joinResults(name: string, locale: string, parts: (PronunciationResult | string)[]): PronunciationResult {
  const resolved = parts.filter((p): p is PronunciationResult => typeof p !== "string");
  const confidence: Confidence = resolved.some((r) => r.confidence === "unknown")
    ? "unknown"
    : resolved.some((r) => r.confidence === "low")
      ? "low"
      : "high";
  const pronunciation = parts.map((p) => (typeof p === "string" ? p : p.pronunciation)).join("");
  return toResult(name, locale, pronunciation, "mixed", confidence);
}

/** Reconnaît les prénoms composés connus et, sinon, analyse les deux moitiés. */
function getHyphenated(name: string, options: LookupOptions, locale: string): PronunciationResult {
  const whole = getOne(name, options, locale);
  if (whole.confidence === "high" || !name.includes("-")) return whole;
  const parts = name.split(/(-+)/u).map((p) => (/^-+$/u.test(p) ? p : getOne(p, options, locale)));
  return joinResults(name, locale, parts);
}

/**
 * Conserve l'orthographe source, traite NOM + PRÉNOM et les patronymes multi-mots.
 * Priorité : correction propriétaire -> dictionnaire combiné -> analogie -> règles.
 * Recherche d'abord les composés avec espaces (p. ex. « De Gaulle »), puis les
 * prénoms composés avec tiret (p. ex. « Marie-Claire »).
 */
export function getPronunciation(rawName: string, options: LookupOptions = {}): PronunciationResult {
  const name = rawName.normalize("NFKC").trim();
  const locale = options.locale ?? DEFAULT_LOCALE;
  if (!safeName(name)) return toResult(name, locale, name, "unresolved", "unknown");
  const whole = getOne(name, options, locale);
  if (whole.confidence === "high") return whole;
  if (!/\s/u.test(name)) return getHyphenated(name, options, locale);

  const words = name.split(/(\s+)/u);
  const resolvedParts: (PronunciationResult | string)[] = [];
  for (let i = 0; i < words.length;) {
    if (/^\s+$/u.test(words[i])) {
      resolvedParts.push(words[i]);
      i++;
      continue;
    }
    // Le plus long groupe de 3, puis 2 mots, en exigeant une entrée connue.
    // Les sous-chaînes inconnues ne sont pas fusionnées arbitrairement.
    let found = false;
    for (const size of [3, 2]) {
      const stop = i + size * 2 - 1;
      if (stop > words.length) continue;
      const combined = words.slice(i, stop).join("");
      const result = getOne(combined, options, locale);
      if (result.confidence !== "high") continue;
      resolvedParts.push(result);
      i = stop;
      found = true;
      break;
    }
    if (!found) {
      resolvedParts.push(getHyphenated(words[i], options, locale));
      i++;
    }
  }
  return joinResults(name, locale, resolvedParts);
}

/**
 * Recopie uniquement des noms passés par les champs structurés (et non déduits des paroles).
 * L'original n'est jamais altéré. Le serveur DOIT recalculer, même si le champ grisé
 * fait partie des données soumises par le navigateur.
 */
export function prepareMusicfulLyrics(
  originalLyrics: string,
  names: readonly string[],
  options: MusicfulPreparationOptions = {},
): { originalLyrics: string; musicfulLyrics: string; results: PronunciationResult[] } {
  const results = [...new Set(names.map((x) => x.trim()).filter(Boolean))]
    .map((name) => getPronunciation(name, options))
    .sort((a, b) => b.name.length - a.name.length);
  let musicfulLyrics = originalLyrics;
  const unknownNamePolicy = options.unknownNamePolicy ?? "use-local-rules";
  for (const result of results) {
    if (result.confidence === "unknown") continue;
    if (result.confidence === "low" && unknownNamePolicy === "keep-original") continue;
    const escaped = result.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`(?<![\\p{L}\\p{M}])${escaped}(?![\\p{L}\\p{M}])`, "giu");
    musicfulLyrics = musicfulLyrics.replace(rx, () => result.pronunciation);
  }
  return { originalLyrics, musicfulLyrics, results };
}
