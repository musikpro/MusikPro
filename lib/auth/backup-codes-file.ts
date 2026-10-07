/**
 * Contenu du fichier texte des codes de secours du double facteur propriétaire. Pas de secret autre que les codes :
 * ni mot de passe, ni clé TOTP.
 */
export function backupCodesFileContent(codes: string[], appName: string, date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return [
    `${appName} — codes de secours du double facteur`,
    `Générés le ${day}`,
    "",
    "Chaque code ne sert qu'une seule fois. Conservez-les hors ligne, dans un endroit privé.",
    "",
    ...codes.map((code, index) => `${String(index + 1).padStart(2, "0")}. ${code}`),
    "",
  ].join("\n");
}

/** Clé de configuration TOTP lisible (groupes de 4) extraite de l'URI otpauth, ou null si elle est absente. */
export function totpSetupKey(uri: string): string | null {
  try {
    const secret = new URL(uri).searchParams.get("secret");
    if (!secret) return null;
    return secret
      .replace(/\s+/g, "")
      .replace(/(.{4})/g, "$1 ")
      .trim();
  } catch {
    return null;
  }
}
