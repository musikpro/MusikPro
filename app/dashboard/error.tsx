"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="shell">
      <div className="card" role="alert">
        <h1>Votre espace est momentanément indisponible</h1>
        <p>Nous n’avons pas pu charger votre compte. Vérifiez votre connexion, puis réessayez.</p>
        <button type="button" className="btn" onClick={reset}>
          Réessayer
        </button>
      </div>
    </main>
  );
}
