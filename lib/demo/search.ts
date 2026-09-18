export function matchesSongSearch(query: string, ...fields: string[]) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr");
  const haystack = normalize(fields.join(" "));
  return normalize(query)
    .trim()
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}
