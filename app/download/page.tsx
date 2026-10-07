import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/banani/Icon";
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
    description: t(
      "Installez MusikPro sur votre téléphone Android : téléchargement du fichier officiel et étapes pas à pas.",
    ),
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
        <h2>{t("Installer MusikPro sur Android")}</h2>
        {release ? (
          <>
            <p>
              {t(
                "Téléchargez le fichier d'installation officiel de MusikPro, puis ouvrez-le : l'application s'installe en quelques secondes sur votre téléphone, sans passer par le Play Store.",
              )}
            </p>
            <p className="download-read-hint" role="note">
              <Icon i="arrow-down" size={18} />
              {t("Lisez ces étapes avant d'installer, puis téléchargez l'application en bas de la page.")}
            </p>

            <h3>{t("Installer en 4 étapes")}</h3>
            <ol className="download-steps">
              <li>{t("Touchez « Télécharger l'application » en bas de cette page.")}</li>
              <li>
                {t(
                  "Ouvrez le fichier depuis la notification de téléchargement ou le dossier Téléchargements. Si Android le demande, autorisez l'installation depuis votre navigateur.",
                )}
              </li>
              <li>
                {t(
                  "Si Google Play Protect affiche le message ci-dessous, touchez « Installer quand même » (parfois derrière « Plus de détails »).",
                )}
              </li>
              <li>{t("Touchez Installer, puis ouvrez MusikPro et connectez-vous avec votre compte.")}</li>
            </ol>

            <details className="download-details">
              <summary>
                <span>{t("Un message s'affiche pendant l'installation ? C'est normal")}</span>
                <small>{t("Touchez pour lire avant d'installer")}</small>
              </summary>

              <figure className="download-figure">
                <Image
                  src="/images/play-protect-message.png"
                  width={530}
                  height={776}
                  alt={t(
                    "Message de Google Play Protect : Appli bloquée pour protéger votre appareil, avec l'option Installer quand même",
                  )}
                  sizes="(max-width: 640px) 80vw, 320px"
                />
                <figcaption>{t("Le message de Google Play Protect tel qu'il apparaît sur le téléphone.")}</figcaption>
              </figure>
              <p>
                {t(
                  "Google Play Protect affiche ce message pour toute application qui n'est pas encore publiée dans le Play Store, parce qu'il ne connaît pas encore son éditeur. Ce n'est qu'une précaution : il ne signale aucun problème avec MusikPro.",
                )}
              </p>
              <p>
                <strong>{t("MusikPro est une application officielle.")}</strong>{" "}
                {t(
                  "Ce fichier n'est proposé que sur musikpro.net, il est signé numériquement par MusikPro, et il ouvre le même service que le site, avec votre compte, vos crédits et vos chansons. Touchez simplement « Installer quand même » pour continuer.",
                )}
              </p>
            </details>

            <h3>{t("Prêt ? Téléchargez l'application")}</h3>
            <div className="download-cta-wrap">
              <a className="download-cta" href="/download/android" download>
                <span className="download-cta-icon" aria-hidden="true">
                  <Icon i="download" size={22} />
                </span>
                <span className="download-cta-text">
                  <strong>{t("Télécharger l'application")}</strong>
                  <small>
                    {translateTemplate("Version {version} · {size} Mo", {
                      version: release.version,
                      size: formatMegabytes(release.sizeBytes),
                    })}
                  </small>
                </span>
              </a>
              <ul className="download-cta-trust">
                <li>{t("Fichier officiel MusikPro")}</li>
                <li>{t("Gratuit")}</li>
              </ul>
            </div>

            <h3>{t("Vérifier le fichier (facultatif)")}</h3>
            <p>
              {t("Empreinte SHA-256 du fichier, pour vérifier son intégrité :")}
              <br />
              <code style={{ wordBreak: "break-all" }}>{release.sha256}</code>
            </p>
          </>
        ) : (
          <>
            <p>
              {t(
                "Le fichier d'installation Android sera bientôt disponible. En attendant, vous pouvez installer MusikPro depuis votre navigateur :",
              )}
            </p>
            <InstallAppButton />
          </>
        )}
      </article>

      <footer className="legal-footer">
        <Link href="/">{t("Retour à l'accueil")}</Link>
      </footer>
    </main>
  );
}
