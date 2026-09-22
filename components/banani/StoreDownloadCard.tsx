"use client";

import { useDemo } from "./DemoProvider";
import { translate as t } from "@/lib/i18n/translate";

function GooglePlayLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="store-logo">
      <path fill="#4285F4" d="M3.7 2.4C3.25 2.83 3 3.53 3 4.4v15.2c0 .87.25 1.57.7 2L14 12 3.7 2.4Z" />
      <path fill="#34A853" d="m3.7 2.4 10.3 9.6 2.6-3.3L5 2.1c-.5-.13-.95-.03-1.3.3Z" />
      <path fill="#FBBC04" d="M3.7 21.6 14 12l2.6 3.3L5 21.9c-.5.13-.95.03-1.3-.3Z" />
      <path fill="#EA4335" d="m16.6 8.7 3.8 2.2c.8.46.8 1.74 0 2.2l-3.8 2.2L14 12l2.6-3.3Z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="store-logo store-logo-apple">
      <path
        fill="currentColor"
        d="M17.05 12.54c-.03-3.05 2.49-4.52 2.61-4.59-1.37-2-3.5-2.28-4.26-2.3-1.79-.18-3.49 1.05-4.4 1.05-.93 0-2.33-1.03-3.84-1-1.95.03-3.77 1.16-4.77 2.89-2.06 3.57-.52 8.82 1.48 11.72.98 1.43 2.15 3.01 3.69 2.95 1.48-.06 2.04-.95 3.83-.95 1.77 0 2.27.95 3.83.92 1.63-.03 2.66-1.43 3.64-2.86 1.13-1.65 1.59-3.25 1.62-3.34-.04-.01-3.11-1.19-3.14-4.74l.01.25ZM14.21 3.66C15.03 2.67 15.58 1.3 15.43 0c-1.18.05-2.61.79-3.46 1.78-.76.88-1.43 2.28-1.25 3.55 1.32.1 2.67-.67 3.49-1.67Z"
      />
    </svg>
  );
}

export default function StoreDownloadCard({ compact = false }: { compact?: boolean }) {
  const demo = useDemo();
  const unavailable = () => demo.notify("L’application MusikPro sera bientôt disponible sur les stores.");
  return (
    <section className={`musik-store-card ${compact ? "musik-store-card-compact" : ""}`}>
      <h2>{t("Télécharger l’application MusikPro")}</h2>
      <p>{t("Créez vos chansons partout, à tout moment.")}</p>
      <div className="musik-store-actions">
        <button type="button" data-demo-ready onClick={unavailable} aria-label="Télécharger MusikPro sur Google Play">
          <GooglePlayLogo />
          <span>
            <small>Disponible sur</small>
            <strong>Google Play</strong>
          </span>
        </button>
        <button type="button" data-demo-ready onClick={unavailable} aria-label="Télécharger MusikPro sur l’App Store">
          <AppleLogo />
          <span>
            <small>Télécharger dans</small>
            <strong>l’App Store</strong>
          </span>
        </button>
      </div>
    </section>
  );
}
