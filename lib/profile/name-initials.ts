export function getNameInitials(name: string, fallback = "MP") {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${Array.from(parts[0])[0] ?? ""}${Array.from(parts[1])[0] ?? ""}`.toLocaleUpperCase("fr-FR");
  }

  if (parts.length === 1) {
    return Array.from(parts[0]).slice(0, 2).join("").toLocaleUpperCase("fr-FR");
  }

  return fallback;
}
