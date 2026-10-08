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
        "Ces conditions expliquent ce que MusikPro vous permet de faire, ce que nous attendons de vous et comment fonctionnent les crédits, les paiements et vos chansons. En créant un compte ou en utilisant le service, vous les acceptez.",
      )}
      sections={[
        {
          title: t("Qui sommes-nous"),
          content: (
            <p>
              <LegalEmail
                text={t(
                  "MusikPro est un service de création de chansons personnalisées par intelligence artificielle, accessible sur le site musikpro.net et dans l’application Android et iPhone. Il est édité par MusikPro, joignable à l’adresse {email}.",
                )}
                email={CONTACT_EMAIL}
              />
            </p>
          ),
        },
        {
          title: t("Le service MusikPro"),
          content: (
            <>
              <p>
                {t(
                  "Vous racontez une histoire, choisissez l’occasion, le style musical, l’ambiance, la langue et la voix. MusikPro génère des paroles par intelligence artificielle, que vous pouvez lire et modifier, puis, à votre demande, deux versions musicales de la chanson. Vous retrouvez vos créations dans votre bibliothèque, où vous pouvez les écouter, les télécharger au format MP3 et les partager.",
                )}
              </p>
              <p>
                {t(
                  "Les fonctions disponibles peuvent évoluer afin d’améliorer le service ou de tenir compte de contraintes techniques. Les chansons sont produites automatiquement : leur rendu (paroles, mélodie, voix, prononciation) peut varier d’une génération à l’autre et ne peut pas être garanti.",
                )}
              </p>
            </>
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
          title: t("Âge minimum"),
          content: (
            <p>
              {t(
                "Vous devez avoir au moins 18 ans pour créer un compte. Une personne de moins de 18 ans ne peut utiliser MusikPro qu’avec l’autorisation et sous la responsabilité de son parent ou de son tuteur, qui accepte alors ces conditions en son nom. MusikPro n’est pas destiné aux enfants de moins de 13 ans.",
              )}
            </p>
          ),
        },
        {
          title: t("Votre compte"),
          content: (
            <p>
              {t(
                "Vous devez fournir des informations exactes, protéger l’accès à votre compte et nous prévenir en cas d’utilisation non autorisée. Vous pouvez vous connecter avec une adresse e-mail et un mot de passe ou avec Google. Vous êtes responsable des actions réalisées depuis votre compte, sauf lorsqu’elles résultent d’une défaillance imputable à MusikPro. Un compte est personnel : ne le partagez pas et ne le cédez pas.",
              )}
            </p>
          ),
        },
        {
          title: t("Crédits, prix et paiement"),
          content: (
            <>
              <p>
                {t(
                  "La génération d’une chanson consomme des crédits : 2 crédits par génération, qui produit deux versions de la chanson. La génération des paroles ne consomme aucun crédit. Le nombre de crédits consommés et les offres proposées sont indiqués dans l’application avant tout achat ou toute génération ; ils peuvent évoluer, sans effet sur les crédits déjà achetés.",
                )}
              </p>
              <p>
                {t(
                  "Les crédits s’achètent par packs, en achat unique (pas d’abonnement ni de renouvellement automatique). Les prix sont établis en francs CFA (XOF) ; un affichage dans une autre devise n’est qu’indicatif, calculé à partir d’un taux de change, et seul le montant en francs CFA est débité. Un code promotionnel, lorsqu’il est valide, réduit le prix du pack mais ne peut pas le rendre gratuit.",
                )}
              </p>
              <p>
                {t(
                  "Le paiement est réalisé sur la page de notre partenaire Chariow (Mobile Money et autres moyens de paiement qu’il propose). Les crédits sont ajoutés à votre solde uniquement après confirmation du paiement par le partenaire. MusikPro ne reçoit ni ne conserve vos numéros de carte ou codes secrets. Les crédits n’ont pas de valeur monétaire, ne sont ni transférables ni échangeables contre de l’argent, et n’ont pas de date d’expiration à ce jour ; ils sont perdus si votre compte est supprimé.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Échec de génération et remboursement"),
          content: (
            <>
              <p>
                {t(
                  "Si une génération ne peut pas démarrer, ou si aucune version de la chanson n’aboutit (échec, annulation ou délai dépassé), les crédits correspondants sont recrédités automatiquement sur votre solde, une seule fois.",
                )}
              </p>
              <p>
                {t(
                  "Une chanson est créée à partir des informations que vous fournissez et génère un coût dès qu’elle est produite. Les crédits achetés ne sont donc pas remboursables en argent, sauf obligation légale ou erreur de notre part, par exemple un débit en double ou un paiement confirmé sans crédits ajoutés. Dans ces cas, écrivez-nous rapidement en indiquant l’adresse e-mail de votre compte et la référence du paiement : nous répondons sous 24 heures en général.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Vos contenus"),
          content: (
            <>
              <p>
                {t(
                  "Vous conservez vos droits sur les textes, noms, indications et contenus que vous transmettez (votre histoire, les prénoms, les réponses aux questions de l’occasion, les paroles que vous modifiez, l’image de pochette). Vous garantissez que vous avez le droit de les utiliser et que leur utilisation ne porte pas atteinte aux droits d’un tiers, notamment au droit à la vie privée et au droit à l’image des personnes citées.",
                )}
              </p>
              <p>
                {t(
                  "Vous accordez à MusikPro une licence mondiale, non exclusive et gratuite, pour la durée pendant laquelle ces contenus restent sur votre compte, afin de les héberger, de les traiter, de les transmettre à nos prestataires de génération (paroles, musique, images) et de les afficher selon vos choix de partage décrits ci-dessous. MusikPro n’utilise pas vos contenus pour entraîner ses propres modèles d’intelligence artificielle.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Vos chansons et vos droits d’usage"),
          content: (
            <>
              <p>
                {t(
                  "Vos chansons sont générées par intelligence artificielle. Vous pouvez les écouter, les télécharger et les partager pour un usage personnel et familial : cadeau, célébration, partage avec vos proches ou sur vos réseaux sociaux. MusikPro ne revendique aucun droit sur les chansons que vous créez, au-delà de la licence décrite dans l’article précédent.",
                )}
              </p>
              <p>
                {t(
                  "Un usage commercial (diffusion sur les plateformes de streaming, publicité, vente, usage dans un produit ou un spot) n’est pas garanti : il dépend des conditions du fournisseur de génération musicale et de la réglementation applicable. Avant tout usage commercial, écrivez-nous pour vérifier ce qui est possible.",
                )}
              </p>
              <p>
                {t(
                  "Du fait de leur nature, les chansons générées peuvent ressembler à celles d’autres utilisateurs, et la protection d’un contenu généré par intelligence artificielle par le droit d’auteur n’est pas assurée dans tous les pays. MusikPro ne garantit ni l’unicité des chansons ni l’absence de droits de tiers sur celles-ci. Vous êtes responsable de l’usage que vous en faites.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Partage, Découvrir et mise en avant"),
          content: (
            <>
              <p>
                {t(
                  "Vos chansons sont privées tant que vous ne les partagez pas. Lorsque vous publiez une chanson, un lien public est créé : toute personne qui possède ce lien peut l’écouter sans compte. Cette page peut être référencée par les moteurs de recherche. Elle affiche le titre, le style, l’occasion, la pochette et l’audio, mais pas les paroles. Le lien cesse de fonctionner si vous supprimez la chanson ou votre compte.",
                )}
              </p>
              <p>
                {t(
                  "Par défaut, chaque chanson terminée apparaît aussi dans la bibliothèque Découvrir, visible par les autres utilisateurs connectés. Ils peuvent l’écouter, mais pas la télécharger ni la partager, et votre nom n’est pas affiché. Le titre d’une chanson contient le prénom du destinataire, l’occasion, le style et le mois de création : n’utilisez pas de nom que vous ne souhaitez pas voir affiché. Vous pouvez retirer une chanson de Découvrir à tout moment depuis sa page.",
                )}
              </p>
              <p>
                {t(
                  "MusikPro peut mettre en avant des chansons publiées sur sa page d’accueil, ou les retirer de ces espaces, notamment pour des raisons de modération ou de qualité.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Utilisation acceptable"),
          content: (
            <>
              <p>
                {t(
                  "Il est interdit d’utiliser MusikPro pour enfreindre la loi, porter atteinte aux droits d’autrui, contourner les protections du service, diffuser un programme malveillant, perturber son fonctionnement ou en extraire les contenus de façon automatisée. Il est aussi interdit d’utiliser les chansons pour entraîner une autre intelligence artificielle ou créer un service concurrent.",
                )}
              </p>
              <p>{t("Vous ne devez pas demander ni publier un contenu :")}</p>
              <ul>
                <li>{t("qui exploite ou met en scène sexuellement des mineurs ;")}</li>
                <li>{t("qui incite à la haine, à la violence ou au terrorisme, ou en fait l’apologie ;")}</li>
                <li>{t("qui constitue du harcèlement, des menaces ou des instructions dangereuses (armes, drogues, automutilation) ;")}</li>
                <li>{t("qui diffame une personne, usurpe l’identité d’autrui ou révèle des informations privées sans son accord ;")}</li>
                <li>
                  {t(
                    "qui cherche à reproduire la voix, le style protégé ou les œuvres d’un artiste ou d’une personne réelle pour faire croire que la chanson est la sienne.",
                  )}
                </li>
              </ul>
              <p>
                {t(
                  "Pour faire respecter ces règles, les textes que vous saisissez et les paroles générées sont analysés automatiquement avant la création de la chanson. Une demande refusée n’est pas traitée et le refus peut être consigné dans nos journaux de sécurité. Nous pouvons retirer une chanson de Découvrir ou de la page d’accueil, limiter ou suspendre un accès lorsqu’une activité présente un risque pour les utilisateurs ou la plateforme.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Propriété intellectuelle de MusikPro"),
          content: (
            <p>
              {t(
                "Le nom MusikPro, le logo, le site, l’application, les textes de l’interface, le design et le code appartiennent à MusikPro ou à ses concédants. Ces conditions ne vous donnent aucun droit sur eux, en dehors du droit d’utiliser le service conformément à ces conditions.",
              )}
            </p>
          ),
        },
        {
          title: t("Services de tiers"),
          content: (
            <p>
              {t(
                "MusikPro s’appuie sur des prestataires (hébergement, base de données, intelligence artificielle pour les paroles et la musique, paiement, e-mails, notifications, stockage d’images). Leur intervention est décrite dans la politique de confidentialité. Un incident chez l’un d’eux peut affecter temporairement le service ; nous ne contrôlons pas leurs conditions propres, qui s’appliquent à leurs services.",
              )}
            </p>
          ),
        },
        {
          title: t("Disponibilité"),
          content: (
            <p>
              {t(
                "Nous cherchons à maintenir MusikPro disponible et fiable. Des opérations de maintenance, incidents techniques ou événements indépendants de notre volonté peuvent toutefois interrompre temporairement certaines fonctions. Une génération en cours peut échouer ou prendre plus de temps que prévu ; les crédits sont alors recrédités comme indiqué plus haut.",
              )}
            </p>
          ),
        },
        {
          title: t("Suspension et suppression du compte"),
          content: (
            <>
              <p>
                {t(
                  "Vous pouvez supprimer votre compte à tout moment depuis la page Sécurité de votre espace : après confirmation par e-mail, votre compte, vos chansons et leurs liens de partage sont effacés et vos crédits restants sont perdus. Les conséquences sur vos données sont détaillées dans la politique de confidentialité.",
                )}
              </p>
              <p>
                {t(
                  "Nous pouvons suspendre ou supprimer un compte en cas de non-respect de ces conditions, de fraude, d’abus ou de risque pour la sécurité du service. Dans les cas où cela est possible, nous vous en indiquons la raison.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Responsabilité"),
          content: (
            <p>
              {t(
                "MusikPro est fourni dans les limites autorisées par la loi applicable, sans garantie que les chansons répondent à une attente particulière ni que le service soit exempt d’interruption ou d’erreur. Chaque utilisateur reste responsable du contenu qu’il fournit, de l’usage de ses créations et de leur conformité aux droits de tiers. Dans la mesure permise par la loi, la responsabilité de MusikPro est limitée aux dommages directs et, au total, au montant que vous avez payé au cours des six derniers mois. Aucune disposition de ces conditions ne limite un droit qui ne peut légalement être exclu, notamment vos droits de consommateur.",
              )}
            </p>
          ),
        },
        {
          title: t("Droit applicable et litiges"),
          content: (
            <p>
              {t(
                "Ces conditions sont régies par le droit applicable dans le pays d’exploitation de MusikPro, la Côte d’Ivoire, sans priver un consommateur de la protection que lui accordent les règles impératives de son pays de résidence. En cas de difficulté, contactez-nous d’abord : nous cherchons une solution amiable avant toute procédure.",
              )}
            </p>
          ),
        },
        {
          title: t("Modification des conditions"),
          content: (
            <p>
              {t(
                "Ces conditions peuvent évoluer avec le service. La date de mise à jour indiquée en haut de cette page permet d’identifier la version applicable. En cas de changement important, nous vous en informons dans l’application ou par e-mail. Continuer à utiliser MusikPro après la modification vaut acceptation de la nouvelle version.",
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
