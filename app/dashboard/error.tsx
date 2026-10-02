"use client";
import { translate as t } from "@/lib/i18n/translate";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="shell">
      <div className="card" role="alert">
        <h1>{t("Votre espace est momentanément indisponible")}</h1>
        <p>{t("Nous n’avons pas pu charger votre compte. Vérifiez votre connexion, puis réessayez.")}</p>
        <button type="button" className="btn" onClick={reset}>
          {t("Réessayer")}
        </button>
      </div>
    </main>
  );
}
