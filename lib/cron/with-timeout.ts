export class CronTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} : délai de ${ms} ms dépassé`);
    this.name = "CronTimeoutError";
  }
}

/**
 * Rend la main après `ms` même si `work` ne répond jamais (appel fournisseur qui traîne). L'opération
 * sous-jacente n'est pas annulée : seul le cron cesse de l'attendre, pour ne pas dépasser le délai
 * d'EasyCron (60 s) et ne pas bloquer les autres éléments du passage.
 */
export async function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new CronTimeoutError(label, ms)), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
