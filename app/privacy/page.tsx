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
      introduction={t(
        "Cette politique explique quelles données MusikPro traite, pourquoi, avec qui elles sont partagées, combien de temps elles sont conservées et quels choix vous sont proposés.",
      )}
      sections={[
        {
          title: t("Qui est responsable de vos données"),
          content: (
            <p>
              <LegalEmail
                text={t(
                  "La société Kehira, dont le siège est à Abidjan (Côte d’Ivoire), éditrice de MusikPro (service de création de chansons personnalisées accessible sur musikpro.net et dans l’application Android et iPhone), est responsable du traitement des données décrites ici. Pour toute question, écrivez à {email}.",
                )}
                email={CONTACT_EMAIL}
              />
            </p>
          ),
        },
        {
          title: t("Données traitées"),
          content: (
            <>
              <p>
                {t(
                  "MusikPro traite les informations nécessaires à la création et à la sécurisation de votre compte, notamment votre nom, votre adresse e-mail et les données de session. Lorsque vous utilisez le service, nous traitons aussi les contenus et préférences que vous fournissez pour préparer vos créations musicales.",
                )}
              </p>
              <ul>
                <li>
                  {t(
                    "Compte : nom, adresse e-mail, mot de passe (stocké sous forme chiffrée irréversible), photo de profil éventuelle, rôle, état de vérification de l’e-mail, sessions de connexion (avec l’adresse IP et le type d’appareil ou de navigateur).",
                  )}
                </li>
                <li>
                  {t(
                    "Création de chansons : l’histoire que vous racontez, les prénoms et prononciations du destinataire et de l’expéditeur, l’occasion, le style, l’ambiance, la langue, la voix, les réponses personnalisées, les paroles générées puis modifiées, les chansons produites, leur titre et leur pochette. Un brouillon de création est enregistré pour vous permettre de reprendre.",
                  )}
                </li>
                <li>
                  {t(
                    "Crédits et paiements : votre solde de crédits, le montant, la devise, la date et l’état de vos achats, la référence du paiement et le code promotionnel éventuel.",
                  )}
                </li>
                <li>
                  {t(
                    "Support : lorsque vous écrivez au support depuis l’application, le sujet, la catégorie, votre message, votre adresse e-mail, votre nom et le numéro de téléphone si vous le renseignez. Ce message est transmis par e-mail et n’est pas conservé dans notre base de données.",
                  )}
                </li>
                <li>
                  {t(
                    "Notifications : vos préférences et, sur Android, l’identifiant de votre appareil si vous activez les notifications.",
                  )}
                </li>
              </ul>
              <p>
                {t(
                  "Selon les fonctions que vous utilisez, MusikPro traite aussi les textes que vous saisissez ou dictez, l’image de pochette que vous choisissez, vos chansons générées et les informations nécessaires à l’achat de crédits (adresse e-mail, numéro de téléphone Mobile Money, montant et état du paiement). MusikPro ne reçoit ni ne conserve les numéros de carte ou les codes secrets de paiement.",
                )}
              </p>
              <p>
                {t(
                  "Des données techniques limitées, telles que l’adresse IP, le type de navigateur, les journaux de sécurité et les erreurs, peuvent être traitées pour protéger et maintenir le service.",
                )}
              </p>
              <p>
                {t(
                  "MusikPro comptabilise aussi, de façon agrégée et sans cookie ni identifiant personnel, le nombre de visites de la page d’accueil publique, à des fins statistiques internes de suivi du service. Nous enregistrons également, avec votre compte, le fait que vous avez commencé ou abandonné une création (et à quelle étape), pour améliorer le parcours ; ces données sont supprimées au bout de 180 jours.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Finalités et fondements"),
          content: (
            <>
              <p>
                {t(
                  "Ces données servent à fournir MusikPro, authentifier les utilisateurs, enregistrer leurs préférences, envoyer les e-mails transactionnels, prévenir les abus, résoudre les incidents et améliorer la fiabilité du service.",
                )}
              </p>
              <ul>
                <li>
                  {t(
                    "Exécution du service que vous demandez : compte, création des chansons, crédits, paiements, support, notifications de chanson prête.",
                  )}
                </li>
                <li>
                  {t(
                    "Intérêt légitime de MusikPro : sécurité, prévention de la fraude et des abus, modération des contenus, limitation du nombre de requêtes, statistiques internes.",
                  )}
                </li>
                <li>
                  {t(
                    "Obligation légale : conservation de l’historique des paiements pour la comptabilité.",
                  )}
                </li>
                <li>
                  {t(
                    "Votre consentement : autorisations de l’appareil (microphone, appareil photo, photos, notifications), que vous pouvez retirer à tout moment.",
                  )}
                </li>
              </ul>
              <p>
                {t(
                  "MusikPro n’utilise pas vos données pour de la publicité ciblée, n’entraîne pas de modèle d’intelligence artificielle avec vos contenus et ne vend pas vos données personnelles.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Vos textes et l’intelligence artificielle"),
          content: (
            <>
              <p>
                {t(
                  "Pour écrire les paroles, le texte que vous saisissez (histoire, prénoms, relation, réponses personnalisées, style, langue) est envoyé à un fournisseur d’intelligence artificielle, qui le traite pour produire les paroles. Pour créer la musique, les paroles, le titre, le style et le choix de voix sont envoyés à un fournisseur de génération musicale. Le même fournisseur d’intelligence artificielle sert à analyser automatiquement les textes avant la génération afin de détecter les contenus interdits par nos conditions.",
                )}
              </p>
              <p>
                {t(
                  "Comme vous écrivez librement, évitez de saisir des informations sensibles (santé, religion, opinions, pièces d’identité, coordonnées bancaires) et des données sur des tiers que vous n’avez pas le droit de partager. Seul le texte dicté est reçu par MusikPro : votre voix n’est pas enregistrée.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Visibilité de vos chansons"),
          content: (
            <>
              <p>
                {t(
                  "Vos chansons sont privées tant que vous ne les partagez pas, avec deux exceptions à connaître. Si vous publiez une chanson, toute personne qui possède son lien peut l’écouter sans compte, et la page peut être référencée par les moteurs de recherche ; elle montre le titre, le style, l’occasion, la pochette et l’audio, jamais les paroles.",
                )}
              </p>
              <p>
                {t(
                  "Une chanson n’est proposée dans la bibliothèque Découvrir que si vous choisissez de la partager ; par défaut, rien n’est partagé. Elle est alors visible par les autres utilisateurs connectés, qui peuvent l’écouter sans la télécharger. Votre nom n’est pas affiché, mais le titre contient le prénom du destinataire, l’occasion, le style et le mois. Vous pouvez retirer une chanson de Découvrir à tout moment, et la supprimer pour faire disparaître son lien public. Certaines chansons publiées peuvent être mises en avant sur la page d’accueil.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Connexion avec Google"),
          content: (
            <p>
              {t(
                "Si vous choisissez « Connectez-vous avec Google », MusikPro reçoit les informations de profil de base que Google vous présente avant votre consentement, comme votre nom, votre adresse e-mail et votre identifiant de compte. MusikPro n’accède pas à votre mot de passe Google.",
              )}
            </p>
          ),
        },
        {
          title: t("Application mobile (Android et iPhone)"),
          content: (
            <>
              <p>
                {t(
                  "L’application MusikPro donne accès au même service que le site. Elle ne contient aucune publicité, n’utilise pas d’identifiant publicitaire et ne suit pas votre activité dans d’autres applications ou sites.",
                )}
              </p>
              <p>
                {t(
                  "Certaines fonctions demandent une autorisation de votre téléphone, utilisée uniquement pour cette fonction :",
                )}
              </p>
              <ul>
                <li>
                  {t(
                    "Microphone : seulement lorsque vous appuyez sur le bouton de dictée, pour transformer votre voix en texte avec le service de reconnaissance vocale de votre appareil. MusikPro reçoit le texte obtenu ; il n’enregistre ni ne conserve votre voix.",
                  )}
                </li>
                <li>
                  {t(
                    "Appareil photo et photos : seulement lorsque vous choisissez la pochette d’une chanson. Seule l’image sélectionnée est envoyée ; MusikPro n’accède pas au reste de votre galerie.",
                  )}
                </li>
                <li>
                  {t(
                    "Enregistrement de fichiers : lorsque vous téléchargez une chanson, le fichier MP3 est enregistré sur votre appareil à votre demande.",
                  )}
                </li>
                <li>
                  {t(
                    "Notifications (Android) : si vous les activez, MusikPro enregistre un identifiant de votre appareil pour vous prévenir quand votre chanson est prête. Cet identifiant est transmis au service de notifications Firebase de Google, uniquement pour acheminer l’alerte. Vous pouvez les désactiver dans l’application (Notifications) ou dans les réglages du téléphone.",
                  )}
                </li>
              </ul>
              <p>
                {t(
                  "Vous pouvez retirer chaque autorisation à tout moment dans les réglages de votre téléphone : la fonction concernée cesse alors de fonctionner, et le reste de l’application continue de fonctionner.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Cookies et stockage sur votre appareil"),
          content: (
            <>
              <p>
                {t(
                  "MusikPro n’utilise aucun cookie publicitaire ni outil de mesure d’audience tiers. Seuls des éléments nécessaires au fonctionnement sont enregistrés :",
                )}
              </p>
              <ul>
                <li>{t("le cookie de session, qui vous garde connecté (jusqu’à 399 jours, renouvelé lorsque vous utilisez le service) ;")}</li>
                <li>{t("un cookie de préférence de langue (1 an) et un cookie temporaire qui évite de rouvrir l’écran de reprise de création (1 heure) ;")}</li>
                <li>
                  {t(
                    "des données enregistrées dans votre navigateur ou application (stockage local) : vos préférences de langue et de devise, votre brouillon de création et les informations de paiement que vous avez saisies (nom, e-mail, téléphone) pour vous éviter de les ressaisir ;",
                  )}
                </li>
                <li>{t("un cache hors ligne de la page d’accueil publique.")}</li>
              </ul>
              <p>
                {t(
                  "Lorsque la vérification anti-robot est activée, le service Cloudflare Turnstile peut déposer ses propres éléments techniques. Vous pouvez effacer ces données à tout moment dans les réglages de votre navigateur ou de votre téléphone.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Prestataires"),
          content: (
            <>
              <p>
                {t(
                  "MusikPro s’appuie sur des prestataires techniques pour héberger l’application, stocker les données, gérer l’authentification, envoyer les e-mails, générer les paroles et la musique par intelligence artificielle (ils reçoivent le texte et les choix nécessaires à la création), encaisser les paiements Mobile Money, héberger les images de pochette et, lorsqu’il est activé, vérifier que l’utilisateur n’est pas un robot. Ils traitent uniquement les données nécessaires à leur mission, selon leurs engagements de sécurité et de confidentialité. MusikPro ne vend pas vos données personnelles.",
                )}
              </p>
              <ul>
                <li>{t("Vercel : hébergement du site et de l’application, tâches planifiées.")}</li>
                <li>{t("Neon : base de données où sont stockées vos données.")}</li>
                <li>{t("OpenAI ou Anthropic (selon la configuration) : écriture des paroles, analyse des contenus, suggestion de prononciation.")}</li>
                <li>{t("Musicful ou MusicGPT : génération de la musique à partir des paroles, du titre, du style et de la voix choisis.")}</li>
                <li>{t("Chariow : paiement. Il reçoit votre e-mail, votre nom, votre téléphone, la référence de la commande et le montant.")}</li>
                <li>{t("Cloudinary : hébergement des images (pochettes, photos de profil) et conversion de certains fichiers audio en MP3.")}</li>
                <li>{t("Resend : envoi des e-mails (vérification, réinitialisation, suppression de compte, support).")}</li>
                <li>{t("Google : connexion avec Google et, sur Android, notifications via Firebase Cloud Messaging.")}</li>
                <li>{t("Cloudflare Turnstile : vérification anti-robot, lorsqu’elle est activée (reçoit l’adresse IP).")}</li>
                <li>{t("Upstash : limitation du nombre de requêtes (identifiant et adresse IP, quelques minutes).")}</li>
                <li>
                  {t(
                    "api.country.is : détection du pays pour proposer la langue et la devise adaptées, en dernier recours, lorsque ni votre préférence ni votre navigateur ne suffisent. Votre adresse IP lui est alors transmise, sans autre donnée.",
                  )}
                </li>
              </ul>
            </>
          ),
        },
        {
          title: t("Transferts hors de votre pays"),
          content: (
            <p>
              {t(
                "Plusieurs de ces prestataires sont situés ou hébergent leurs serveurs hors de Côte d’Ivoire et hors de votre pays de résidence, notamment aux États-Unis et en Europe. Vos données peuvent donc y être traitées, sous réserve des engagements contractuels de sécurité et de confidentialité de ces prestataires.",
              )}
            </p>
          ),
        },
        {
          title: t("Durées de conservation"),
          content: (
            <ul>
              <li>{t("Compte, chansons, paroles et liens de partage : jusqu’à la suppression par vous de la chanson ou du compte.")}</li>
              <li>{t("Brouillon de création : 30 jours après la dernière sauvegarde, ou dès le lancement de la génération.")}</li>
              <li>{t("Sessions de connexion : jusqu’à 399 jours, ou jusqu’à votre déconnexion.")}</li>
              <li>{t("Statistiques de parcours (visites, créations commencées ou abandonnées) : 180 jours.")}</li>
              <li>
                {t(
                  "Historique des paiements : conservé sans lien avec votre identité après la suppression de votre compte, pour la comptabilité.",
                )}
              </li>
              <li>
                {t(
                  "Journaux de sécurité et événements de paiement : le temps nécessaire à la protection du service et au traitement des litiges.",
                )}
              </li>
              <li>
                {t(
                  "Chez les fournisseurs de génération musicale, la durée de conservation des fichiers dépend de leurs propres règles : nous ne pouvons pas toujours en demander l’effacement.",
                )}
              </li>
            </ul>
          ),
        },
        {
          title: t("Sécurité"),
          content: (
            <p>
              {t(
                "Les connexions sont chiffrées (HTTPS), les mots de passe sont stockés sous forme chiffrée irréversible, les jetons de connexion Google et les clés de nos prestataires sont chiffrés, l’accès à la base de données est restreint par rôle, et le nombre de tentatives de connexion et de requêtes est limité. L’espace d’administration est protégé par une vérification en deux étapes. Aucun système ne pouvant garantir une sécurité absolue, nous réévaluons régulièrement ces protections.",
              )}
            </p>
          ),
        },
        {
          title: t("Mineurs"),
          content: (
            <p>
              {t(
                "MusikPro s’adresse aux personnes de 18 ans et plus ; un mineur ne peut l’utiliser qu’avec l’accord de son parent ou tuteur. Le service n’est pas destiné aux enfants de moins de 13 ans : si vous pensez qu’un enfant nous a transmis des données, écrivez-nous et nous les supprimerons.",
              )}
            </p>
          ),
        },
        {
          title: t("Vos droits"),
          content: (
            <>
              <p>
                {t(
                  "Vous pouvez supprimer vous-même votre compte à tout moment depuis la page Sécurité de votre espace, sur le site comme dans l’application mobile : un e-mail de confirmation vous est envoyé, puis votre compte, vos chansons et leurs liens de partage sont effacés. L’historique des paiements est conservé de façon anonyme pour répondre aux obligations comptables, et les journaux de sécurité sont conservés pour la durée nécessaire à la protection du service.",
                )}
              </p>
              <p>
                <LegalEmail
                  text={t(
                    "Vous pouvez demander l’accès, la correction ou la suppression de vos données, ainsi que poser toute question relative à leur traitement, en écrivant à {email}. Certaines informations peuvent être conservées lorsqu’une obligation légale ou un besoin de sécurité l’exige.",
                  )}
                  email={CONTACT_EMAIL}
                />
              </p>
              <p>
                {t(
                  "Selon la réglementation applicable à votre situation (notamment la loi ivoirienne sur la protection des données à caractère personnel ou, pour les résidents européens, le RGPD), vous disposez aussi d’un droit d’opposition, de limitation et de portabilité de vos données, ainsi que du droit d’introduire une réclamation auprès de l’autorité de protection des données de votre pays. Nous répondons à votre demande dans un délai d’un mois.",
                )}
              </p>
            </>
          ),
        },
        {
          title: t("Mises à jour"),
          content: (
            <p>
              {t(
                "Cette politique peut évoluer avec le service. Sa date de mise à jour permet d’identifier la version actuellement applicable. En cas de changement important, nous vous en informons dans l’application ou par e-mail.",
              )}
            </p>
          ),
        },
      ]}
    />
  );
}
