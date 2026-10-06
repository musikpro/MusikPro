/** Identifiant de l'application Android : un fichier qui ne le contient pas n'est pas notre application. */
export const APP_PACKAGE_NAME = "com.musikpro.app";

/** Taille maximale d'un fichier d'installation : refus strict au-dessus. */
export const MAX_APK_BYTES = 35 * 1024 * 1024;
/** Au-dessus de ce seuil, l'admin est prévenu que le fichier devient lourd pour les téléchargements mobiles. */
export const WARN_APK_BYTES = 30 * 1024 * 1024;

/** Dossier du stockage privé réservé aux fichiers d'installation Android. */
export const ANDROID_BLOB_PREFIX = "app-releases/android/";

export const APK_CONTENT_TYPES = [
  "application/vnd.android.package-archive",
  "application/octet-stream",
  "application/zip",
  "application/java-archive",
];

export const APP_PLATFORMS = ["android"] as const;
export type AppPlatform = (typeof APP_PLATFORMS)[number];
