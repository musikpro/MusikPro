import type { Metadata } from "next";
import Link from "next/link";
import InstallAppButton from "@/components/pwa/install-app-button";
import { getPublishedRelease } from "@/lib/app-releases/server";
import { primeOverlay } from "@/lib/i18n/overlay-server";
import { resolvePageLocale } from "@/lib/i18n/page-locale-server";
import { translateForLocale, translateTemplateForLocale } from "@/lib/i18n/translate";
import { buildMetadata } from "@/lib/seo/metadata";

// Rendu dynamique : le nonce de la CSP (proxy.ts) n'existe qu'au moment de la requête.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolvePageLocale();
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);
  return buildMetadata({
    title: t("Télécharger l'application MusikPro"),
    description: t("Installez MusikPro sur votre téléphone Android ou iPhone."),
    path: "/download",
  });
}

const formatMegabytes = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

export default async function DownloadPage() {
  const locale = await resolvePageLocale();
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);
  // Alias nommé `translateTemplate` : le scanner i18n ne reconnaît pas `translateTemplateForLocale(`.
  const translateTemplate = (text: string, params: Record<string, string | number>) =>
    translateTemplateForLocale(text, params, locale);
  const release = await getPublishedRelease("android");

  return (
    <main className="legal-shell">
      <header className="legal-hero">
        <Link className="legal-brand" href="/">
          MusikPro
        </Link>
        <p className="legal-eyebrow">{t("Application mobile")}</p>
        <h1>{t("Télécharger l'application MusikPro")}</h1>
        <p className="legal-intro">
          {t("Créez vos chansons personnalisées depuis votre téléphone, avec le même compte que sur le site.")}
        </p>
      </header>

      <article className="legal-card" id="android">
        <h2>{t("Android")}</h2>
        <h3>{t("Installation recommandée, sans avertissement")}</h3>
        <p>
          {t(
            "Installez MusikPro directement depuis votre navigateur : l'icône apparaît sur votre écran d'accueil et l'application s'ouvre en plein écran, avec les mises à jour automatiques.",
          )}
        </p>
        <InstallAppButton />

        {release ? (
          <>
            <h3>{t("Fichier d'installation (APK), pour utilisateurs avancés")}</h3>
            <p>
              {translateTemplate("Version {version} · {size} Mo", {
                version: release.version,
                size: formatMegabytes(release.sizeBytes),
              })}
            </p>
            <p>
              <a className="download-cta-secondary" href="/download/android" download>
                {t("Télécharger l'APK Android")}
              </a>
            </p>
            <ol>
              <li>{t("Ouvrez le fichier téléchargé depuis les notifications ou le dossier Téléchargements.")}</li>
              <li>
                {t(
                  "Si Android le demande, autorisez l'installation depuis ce navigateur (réglage « Installer des applications inconnues »).",
                )}
              </li>
              <li>{t("Appuyez sur Installer, puis ouvrez MusikPro.")}</li>
            </ol>
            <p>
              {t(
                "Android peut afficher un avertissement parce que l'application ne vient pas du Play Store : c'est normal pour toute application installée depuis un fichier. Elle est signée par MusikPro ; vous pouvez vérifier l'empreinte du fichier ci-dessous.",
              )}
            </p>
            <p>
              {t("Empreinte SHA-256 du fichier, pour vérifier son intégrité :")}
              <br />
              <code style={{ wordBreak: "break-all" }}>{release.sha256}</code>
            </p>
          </>
        ) : null}
      </article>

      <article className="legal-card" id="iphone">
        <h2>{t("iPhone")}</h2>
        <p>{t("Installez MusikPro sur l'écran d'accueil de votre iPhone, sans passer par l'App Store :")}</p>
        <ol>
          <li>{t("Ouvrez musikpro.net dans Safari.")}</li>
          <li>{t("Touchez le bouton Partager, en bas de l'écran.")}</li>
          <li>{t("Choisissez « Sur l'écran d'accueil », puis Ajouter.")}</li>
        </ol>
        <p>
          {t(
            "L'icône MusikPro apparaît alors sur votre écran d'accueil et s'ouvre en plein écran, comme une application.",
          )}
        </p>
      </article>

      <footer className="legal-footer">
        <Link href="/">{t("Retour à l'accueil")}</Link>
      </footer>
    </main>
  );
}
