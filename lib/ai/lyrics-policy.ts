export const LYRICS_MAX_WORDS = 900;
export const LYRICS_MAX_DURATION_SECONDS = 4 * 60;
const ESTIMATED_SUNG_WORDS_PER_MINUTE = 150;

export function countLyricsWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
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
