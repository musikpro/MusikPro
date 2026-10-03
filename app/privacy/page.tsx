import type { Metadata } from "next";
import { LegalEmail, LegalPage } from "@/components/legal-page";
import { buildMetadata } from "@/lib/seo/metadata";
import { pickLegalLocale } from "@/lib/i18n/legal-locale";
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
  return { locale, forcedFrench: lang === "fr" };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { locale } = await legalLocale(searchParams);
  const t = (text: string) => translateForLocale(text, locale);
  return buildMetadata({
    title: t("Politique de confidentialité"),
    description: t(
      "Découvrez comment MusikPro collecte, utilise et protège les données nécessaires à son service de création musicale.",
    ),
    path: "/privacy",
  });
}

export default async function PrivacyPage({ searchParams }: PageProps) {
  const { locale, forcedFrench } = await legalLocale(searchParams);
  const t = (text: string) => translateForLocale(text, locale);
  return (
    <LegalPage
      locale={locale}
      forcedFrench={forcedFrench}
      path="/privacy"
      eyebrow={t("Vie privée")}
      title={t("Politique de confidentialité")}
      introduction={t("Cette politique explique quelles données MusikPro traite, pourquoi elles sont utilisées et quels choix vous sont proposés.")}
      sections={[
        {
          title: t("Données traitées"),
          content: (
            <>
              <p>
                {t("MusikPro traite les informations nécessaires à la création et à la sécurisation de votre compte, notamment votre nom, votre adresse e-mail et les données de session. Lorsque vous utilisez le service, nous traitons aussi les contenus et préférences que vous fournissez pour préparer vos créations musicales.")}
              </p>
              <p>
                {t("Des données techniques limitées, telles que l’adresse IP, le type de navigateur, les journaux de sécurité et les erreurs, peuvent être traitées pour protéger et maintenir le service.")}
              </p>
              <p>
                {t("MusikPro comptabilise aussi, de façon agrégée et sans cookie ni identifiant personnel, le nombre de visites de la page d’accueil publique, à des fins statistiques internes de suivi du service.")}
              </p>
            </>
          ),
        },
        {
          title: t("Finalités"),
          content: (
            <p>
              {t("Ces données servent à fournir MusikPro, authentifier les utilisateurs, enregistrer leurs préférences, envoyer les e-mails transactionnels, prévenir les abus, résoudre les incidents et améliorer la fiabilité du service.")}
            </p>
          ),
        },
        {
          title: t("Connexion avec Google"),
          content: (
            <p>
              {t("Si vous choisissez « Connectez-vous avec Google », MusikPro reçoit les informations de profil de base que Google vous présente avant votre consentement, comme votre nom, votre adresse e-mail et votre identifiant de compte. MusikPro n’accède pas à votre mot de passe Google.")}
            </p>
          ),
        },
        {
          title: t("Prestataires"),
          content: (
            <p>
              {t("MusikPro s’appuie sur des prestataires techniques pour héberger l’application, stocker les données, gérer l’authentification et envoyer les e-mails. Ils traitent uniquement les données nécessaires à leur mission, selon leurs engagements de sécurité et de confidentialité. MusikPro ne vend pas vos données personnelles.")}
            </p>
          ),
        },
        {
          title: t("Conservation et sécurité"),
          content: (
            <p>
              {t("Les données sont conservées pendant la durée nécessaire au service, à la sécurité et aux obligations applicables. Des mesures techniques et organisationnelles limitent les accès non autorisés. Aucun système ne pouvant garantir une sécurité absolue, nous réévaluons régulièrement ces protections.")}
            </p>
          ),
        },
        {
          title: t("Vos droits"),
          content: (
            <p>
              <LegalEmail
                text={t("Vous pouvez demander l’accès, la correction ou la suppression de vos données, ainsi que poser toute question relative à leur traitement, en écrivant à {email}. Certaines informations peuvent être conservées lorsqu’une obligation légale ou un besoin de sécurité l’exige.")}
                email={CONTACT_EMAIL}
              />
            </p>
          ),
        },
        {
          title: t("Mises à jour"),
          content: (
            <p>
              {t("Cette politique peut évoluer avec le service. Sa date de mise à jour permet d’identifier la version actuellement applicable.")}
            </p>
          ),
        },
      ]}
    />
  );
}
