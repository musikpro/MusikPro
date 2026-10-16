import type { DataCollection } from "@sentry/core";

/**
 * Minimisation des données envoyées à Sentry : ni cookies, ni en-têtes, ni corps de requête,
 * ni paramètres d'URL, ni requêtes SQL, ni textes IA (paroles, prompts), ni identité utilisateur.
 */
export const sentryDataCollection: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
  genAI: { inputs: false, outputs: false },
};

export const sentryTracesSampleRate = 0.1;
