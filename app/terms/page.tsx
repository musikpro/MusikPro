import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { buildMetadata } from "@/lib/seo/metadata";

// Forced dynamic: the CSP nonce (lib/security/headers.ts, set per request in proxy.ts) only
// exists at request time, so a statically prerendered page would ship without one and Next's
// own hydration scripts would be blocked by script-src.
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Conditions d’utilisation",
  description: "Consultez les règles qui encadrent l’accès au service de création musicale MusikPro.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Cadre d’utilisation"
      title="Conditions d’utilisation"
      introduction="En utilisant MusikPro, vous acceptez les règles ci-dessous, conçues pour offrir un service fiable et respectueux à chacun."
      sections={[
        {
          title: "Le service MusikPro",
          content: (
            <p>
              MusikPro permet de préparer et gérer des créations musicales personnalisées. Les fonctions disponibles
              peuvent évoluer afin d’améliorer le service ou de tenir compte de contraintes techniques.
            </p>
          ),
        },
        {
          title: "Votre compte",
          content: (
            <p>
              Vous devez fournir des informations exactes, protéger l’accès à votre compte et nous prévenir en cas
              d’utilisation non autorisée. Vous êtes responsable des actions réalisées depuis votre compte, sauf
              lorsqu’elles résultent d’une défaillance imputable à MusikPro.
            </p>
          ),
        },
        {
          title: "Contenus et droits",
          content: (
            <p>
              Vous conservez vos droits sur les textes, indications et contenus que vous transmettez. Vous accordez à
              MusikPro l’autorisation limitée de les traiter pour fournir les fonctions demandées. Vous devez disposer
              des droits nécessaires sur tout contenu envoyé au service.
            </p>
          ),
        },
        {
          title: "Utilisation acceptable",
          content: (
            <p>
              Il est interdit d’utiliser MusikPro pour enfreindre la loi, porter atteinte aux droits d’autrui,
              contourner les protections du service, diffuser un programme malveillant ou perturber son fonctionnement.
              Un accès peut être limité lorsqu’une activité présente un risque pour les utilisateurs ou la plateforme.
            </p>
          ),
        },
        {
          title: "Disponibilité",
          content: (
            <p>
              Nous cherchons à maintenir MusikPro disponible et fiable. Des opérations de maintenance, incidents
              techniques ou événements indépendants de notre volonté peuvent toutefois interrompre temporairement
              certaines fonctions.
            </p>
          ),
        },
        {
          title: "Responsabilité",
          content: (
            <p>
              MusikPro est fourni dans les limites autorisées par la loi applicable. Chaque utilisateur reste
              responsable de l’usage de ses créations et de leur conformité aux droits de tiers. Aucune disposition de
              ces conditions ne limite un droit qui ne peut légalement être exclu.
            </p>
          ),
        },
        {
          title: "Contact",
          content: (
            <p>
              Pour toute question concernant le service ou ces conditions, écrivez à{" "}
              <a href="mailto:musikpro2026@gmail.com">musikpro2026@gmail.com</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
