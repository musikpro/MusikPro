"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { translate as t } from "@/lib/i18n/translate";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <main role="alert">
          <h1>{t("Une erreur est survenue")}</h1>
          <p>{t("Le problème a été signalé. Vous pouvez réessayer.")}</p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 16px" }}>
            {t("Réessayer")}
          </button>
        </main>
      </body>
    </html>
  );
}
