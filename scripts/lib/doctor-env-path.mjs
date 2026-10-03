import os from "node:os";
import path from "node:path";

// Environnement lu par le doctor : `.env.local` (comportement historique) ; si DOCTOR_ENV_FILE est défini,
// ce fichier s'ajoute PAR-DESSUS `.env.local` (ses valeurs l'emportent, les autres restent celles de `.env.local`).
// Usage type : un fichier de production gardé hors du dépôt qui ne contient que DATABASE_URL,
// DATABASE_URL_DIRECT et APP_URL, pour que le rapport « en ligne » vérifie la vraie cible.
export function resolveDoctorEnvPaths(root, override = process.env.DOCTOR_ENV_FILE) {
  const baseEnvPath = path.join(root, ".env.local");
  const value = (override ?? "").trim();
  if (!value) return { baseEnvPath, overlayEnvPath: null };
  const expanded = value === "~" || value.startsWith("~/") ? path.join(os.homedir(), value.slice(1)) : value;
  return { baseEnvPath, overlayEnvPath: path.resolve(root, expanded) };
}

export function parseEnvText(text) {
  return Object.fromEntries(
    String(text)
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((l) => !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return i < 0
          ? [l.trim(), ""]
          : [
              l.slice(0, i).trim(),
              l
                .slice(i + 1)
                .trim()
                .replace(/^['"]|['"]$/g, ""),
            ];
      }),
  );
}

export function mergeEnv(base, overlay) {
  return { ...base, ...overlay };
}
