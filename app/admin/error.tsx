"use client";

import Icon from "@/components/banani/Icon";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="admin-dashboard">
      <section className="admin-panel admin-error-state" role="alert">
        <span>
          <Icon i="circle-alert" size={24} />
        </span>
        <h1>Impossible de charger le tableau de bord</h1>
        <p>Une erreur est survenue pendant la lecture des données. Vous pouvez relancer le chargement.</p>
        <button type="button" onClick={reset}>
          <Icon i="refresh-cw" size={17} />
          Réessayer
        </button>
      </section>
    </main>
  );
}
