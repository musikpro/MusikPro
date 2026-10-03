import os from "node:os";
import path from "node:path";

// Fichier d'environnement lu par le doctor : `.env.local` par défaut (comportement historique), ou le fichier
// désigné par DOCTOR_ENV_FILE (ex. variables de production, gardées hors du dépôt) pour que le rapport
// « en ligne » vérifie la vraie cible.
export function resolveDoctorEnvPath(root, override = process.env.DOCTOR_ENV_FILE) {
  const value = (override ?? "").trim();
  if (!value) return { envPath: path.join(root, ".env.local"), custom: false };
  const expanded = value === "~" || value.startsWith("~/") ? path.join(os.homedir(), value.slice(1)) : value;
  return { envPath: path.resolve(root, expanded), custom: true };
}
