import type { Metadata } from "next";
import { LegalEmail, LegalPage } from "@/components/legal-page";
import { buildMetadata } from "@/lib/seo/metadata";
import { isFrenchForced, pickLegalLocale } from "@/lib/i18n/legal-locale";
import { primeOverlay } from "@/lib/i18n/overlay-server";
import { resolvePageLocale } from "@/lib/i18n/page-locale-server";
import { translateForLocale } from "@/lib/i18n/translate";

// Forced dynamic: the CSP nonce (lib/security/headers.ts, set per request in proxy.ts) only
// exists at request time, so a statically prerendered page would ship without one and Next's
// own hydration scripts would be blocked by script-src.
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ lang?: string | string[] }> };

const CONTACT_EMAIL = "musikpro2026@gmail.com";

async function legalLocale(searchParams: PageProps["searchParams"]) {
  const { lang } = await searchParams;
  const pageLocale = await resolvePageLocale();
  const locale = pickLegalLocale(pageLocale, lang);
  await primeOverlay(locale);
  return { locale, forcedFrench: isFrenchForced(lang) };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { locale } = await legalLocale(searchParams);
  const t = (text: string) => translateForLocale(text, locale);
  return buildMetadata({
    title: t("Conditions d’utilisation"),
    description: t("Consultez les règles qui encadrent l’accès au service de création musicale MusikPro."),
    path: "/terms",
  });
}

export default async function TermsPage({ searchParams }: PageProps) {
  const { locale, forcedFrench } = await legalLocale(searchParams);
  const t = (text: string) => translateForLocale(text, locale);
  return (
    <LegalPage
      locale={locale}
      forcedFrench={forcedFrench}
      path="/terms"
      eyebrow={t("Cadre d’utilisation")}
      title={t("Conditions d’utilisation")}
      introduction={t(
        "En utilisant MusikPro, vous acceptez les règles ci-dessous, conçues pour offrir un service fiable et respectueux à chacun.",
      )}
      sections={[
        {
          title: t("Le service MusikPro"),
          content: (
            <p>
              {t(
                "MusikPro permet de préparer et gérer des créations musicales personnalisées. Les fonctions disponibles peuvent évoluer afin d’améliorer le service ou de tenir compte de contraintes techniques.",
              )}
            </p>
          ),
        },
        {
          title: t("Application mobile"),
          content: (
            <p>
              {t(
                "L’application Android et iPhone donne accès au même service que le site, avec les mêmes règles. Google Play et l’App Store ne sont que des boutiques de distribution : Google et Apple ne sont pas parties à ces conditions et ne sont pas responsables du service. Certaines fonctions demandent des autorisations de votre téléphone (microphone, appareil photo, photos) que vous pouvez refuser ou retirer à tout moment.",
              )}
            </p>
          ),
        },
        {
          title: t("Votre compte"),
          content: (
            <p>
              {t(
                "Vous devez fournir des informations exactes, protéger l’accès à votre compte et nous prévenir en cas d’utilisation non autorisée. Vous êtes responsable des actions réalisées depuis votre compte, sauf lorsqu’elles résultent d’une défaillance imputable à MusikPro. Vous pouvez supprimer votre compte à tout moment depuis la page Sécurité de votre espace.",
              )}
            </p>
          ),
        },
        {
          title: t("Contenus et droits"),
          content: (
            <p>
              {t(
                "Vous conservez vos droits sur les textes, indications et contenus que vous transmettez. Vous accordez à MusikPro l’autorisation limitée de les traiter pour fournir les fonctions demandées. Vous devez disposer des droits nécessaires sur tout contenu envoyé au service.",
              )}
            </p>
          ),
        },
        {
          title: t("Utilisation acceptable"),
          content: (
            <p>
              {t(
                "Il est interdit d’utiliser MusikPro pour enfreindre la loi, porter atteinte aux droits d’autrui, contourner les protections du service, diffuser un programme malveillant ou perturber son fonctionnement. Un accès peut être limité lorsqu’une activité présente un risque pour les utilisateurs ou la plateforme.",
              )}
            </p>
          ),
        },
        {
          title: t("Disponibilité"),
          content: (
            <p>
              {t(
                "Nous cherchons à maintenir MusikPro disponible et fiable. Des opérations de maintenance, incidents techniques ou événements indépendants de notre volonté peuvent toutefois interrompre temporairement certaines fonctions.",
              )}
            </p>
          ),
        },
        {
          title: t("Responsabilité"),
          content: (
            <p>
              {t(
                "MusikPro est fourni dans les limites autorisées par la loi applicable. Chaque utilisateur reste responsable de l’usage de ses créations et de leur conformité aux droits de tiers. Aucune disposition de ces conditions ne limite un droit qui ne peut légalement être exclu.",
              )}
            </p>
          ),
        },
        {
          title: t("Contact"),
          content: (
            <p>
              <LegalEmail
                text={t("Pour toute question concernant le service ou ces conditions, écrivez à {email}.")}
                email={CONTACT_EMAIL}
              />
            </p>
          ),
        },
      ]}
    />
  );
}
