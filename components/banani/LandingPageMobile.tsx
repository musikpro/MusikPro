import Link from "next/link";
import AppLogo from "./AppLogo";
import Icon from "./Icon";
import Reveal from "./Reveal";
import LandingFaqItem from "./LandingFaqItem";
import { GooglePlayLogo, AppleLogo } from "./StoreDownloadCard";
import LandingLanguageSwitcher, { type LandingLanguageOption } from "./LandingLanguageSwitcher";
import MobileLandingMenu from "./MobileLandingMenu";
import HeroRotatingText, { type HeroRotatingTextItem } from "./HeroRotatingText";
import LandingSongCarousel from "./LandingSongCarousel";
import LandingLibraryCard from "./LandingLibraryCard";
import ExclusiveAudioPlayback from "./ExclusiveAudioPlayback";
import { HERO_TEXT_SIZE_CLASSES, type HeroAnimationType, type HeroTextSize } from "@/lib/hero-animation/types";
import type { LandingFeaturedSong } from "@/lib/landing-features/server";

export type LandingOccasion = { id: string; emoji: string; label: string };
export type LandingHeroText = HeroRotatingTextItem;
export type LandingStyle = { id: string; label: string };
export type LandingTrendingSong = LandingFeaturedSong;

type Props = {
  t: (text: string) => string;
  versionsLabel: string;
  creditsExplainerLabel: string;
  languageFlag: string;
  languageLabel: string;
  languageOptions: LandingLanguageOption[];
  occasions: LandingOccasion[];
  musicStyles: LandingStyle[];
  showcaseSongs: LandingTrendingSong[];
  librarySongs: LandingTrendingSong[];
  heroHeadline: string;
  heroTexts: LandingHeroText[];
  heroAnimationType: HeroAnimationType;
  heroTextSize: HeroTextSize;
  storeLinks: { googlePlayUrl: string | null; appStoreUrl: string | null };
};

// Splits already-translated text into <span> words that fade/slide up in sequence on page load
// (animation-delay staggered per word — see .hero-word in app/dashboard/banani.css).
function AnimatedHeadline({
  text,
  className,
  baseDelay = 0,
}: {
  text: string;
  className?: string;
  baseDelay?: number;
}) {
  const words = text.split(" ");
  return (
    <h1 className={className}>
      {words.flatMap((word, i) => [
        <span key={`w-${i}`} className="hero-word" style={{ animationDelay: `${baseDelay + i * 90}ms` }}>
          {word}
        </span>,
        i < words.length - 1 ? " " : "",
      ])}
    </h1>
  );
}

const OCCASION_TINTS = ["landing-tint-0", "landing-tint-1", "landing-tint-2", "landing-tint-3"];

export default function LandingPageMobile({
  t,
  versionsLabel,
  creditsExplainerLabel,
  languageFlag,
  languageLabel,
  languageOptions,
  occasions,
  musicStyles,
  showcaseSongs,
  librarySongs,
  heroHeadline,
  heroTexts,
  heroAnimationType,
  heroTextSize,
  storeLinks,
}: Props) {
  const faqs = [
    {
      q: t("Comment fonctionne la génération ?"),
      a: `${t(
        "Tu décris ton histoire, choisis un style et une ambiance, et notre IA compose une chanson unique avec des paroles personnalisées.",
      )} ${t("Tu choisis la langue des paroles et la voix avant la génération, parmi plusieurs langues disponibles.")}`,
    },
    {
      q: t("Combien de versions vais-je recevoir et puis-je modifier les paroles ?"),
      a: `${versionsLabel}. ${t("Tu gardes les deux !")} ${t("Avant la génération musicale, tu peux lire et modifier les paroles générées par l'IA.")}`,
    },
    {
      q: t("Comment fonctionnent les crédits ?"),
      a: `${creditsExplainerLabel} ${t("Tu achètes des crédits en packs selon tes besoins.")}`,
    },
    {
      q: t("Puis-je publier ma chanson ?"),
      a: t("Oui, tu peux publier une version dans notre bibliothèque publique."),
    },
  ];
  const navLinks = [
    { href: "#accueil", label: t("Accueil") },
    { href: "#exemples", label: t("Réalisations") },
    { href: "#bibliotheque", label: t("Bibliothèque") },
    { href: "#faq", label: t("FAQ") },
  ];

  return (
    <div className="landing-page bg-background font-body text-foreground">
      <ExclusiveAudioPlayback />
      <nav className="landing-nav relative border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <a href="#accueil" aria-label={t("Accueil")}>
          <AppLogo size="sm" />
        </a>
        <div className="flex items-center gap-2 ml-auto">
          <LandingLanguageSwitcher
            languages={languageOptions}
            currentFlag={languageFlag}
            currentLabel={languageLabel}
            compact
          />
          <Link
            href="/login"
            className="landing-nav-cta px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg"
          >
            {t("Connexion")}
          </Link>
          <MobileLandingMenu links={navLinks} menuLabel={t("Menu")} closeLabel={t("Fermer")} />
        </div>
      </nav>

      <section
        id="accueil"
        className="hero-glow relative flex flex-col items-center justify-center text-center px-5 pt-12 pb-16 overflow-hidden"
      >
        <div
          className="hero-orb"
          style={{
            width: 200,
            height: 200,
            top: -50,
            left: -60,
            background: "radial-gradient(circle, rgba(242,101,34,0.35), transparent 70%)",
          }}
        />
        <div
          className="hero-orb"
          style={{
            width: 220,
            height: 220,
            bottom: -60,
            right: -60,
            background: "radial-gradient(circle, rgba(244,132,95,0.30), transparent 70%)",
            animationDelay: "2s",
          }}
        />

        <div className="hero-float absolute left-3 top-24 w-10 h-10 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center backdrop-blur">
          <Icon i="music" size={18} className="text-white/70" />
        </div>
        <div
          className="hero-float absolute right-3 top-24 w-10 h-10 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center backdrop-blur"
          style={{ animationDelay: "1.2s" }}
        >
          <Icon i="music-2" size={18} className="text-white/70" />
        </div>

        <div className="hero-badge inline-flex items-center gap-1.5 bg-white/15 text-white px-4 py-2 rounded-xl text-xs font-semibold mb-5 border border-white/25 backdrop-blur">
          <span className="hero-badge-dot w-1.5 h-1.5 rounded-full bg-white inline-block" />
          <span>{t("L'émotion en musique")}</span>
        </div>
        <AnimatedHeadline
          text={heroHeadline}
          className="font-headings font-bold text-3xl text-white leading-tight mb-2"
          baseDelay={250}
        />
        <HeroRotatingText
          texts={heroTexts}
          animationType={heroAnimationType}
          className={`font-bold text-white/90 mb-4 ${HERO_TEXT_SIZE_CLASSES[heroTextSize].mobile}`}
        />
        <p className="hero-badge text-base text-white/85 mb-6 leading-relaxed" style={{ animationDelay: "750ms" }}>
          {t("Raconte ton histoire, choisis ton style, et reçois 2 versions uniques de ta chanson.")}
        </p>
        <div className="hero-badge flex items-center justify-center gap-1.5 mb-6" style={{ animationDelay: "850ms" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
          <span className="text-sm font-semibold text-white">{versionsLabel}</span>
        </div>
        <Link
          href="/register"
          className="cta-glow bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-2 mb-5"
        >
          <Icon i="music-2" size={18} /> {t("Créer ma chanson")}
        </Link>
        <p className="text-xs text-white/70">{t("Paiement Mobile Money")}</p>
      </section>

      {showcaseSongs.length ? (
        <section id="exemples" className="landing-section-diagonal px-4 py-10">
          <Reveal className="text-center mb-6">
            <h2 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Ils ont créé avec MusikPro")}</h2>
            <p className="text-sm text-muted-foreground">{t("Chansons créées pour des moments uniques")}</p>
          </Reveal>
          <LandingSongCarousel
            songs={showcaseSongs}
            labels={{ listen: t("Écouter"), navigation: t("Navigation des chansons") }}
          />
        </section>
      ) : null}

      {storeLinks.googlePlayUrl || storeLinks.appStoreUrl ? (
        <section className="landing-section-grid px-4 py-10 text-center">
          <Reveal>
            <h2 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Emporte ta musique partout")}</h2>
            <p className="text-sm text-muted-foreground mb-8">{t("Crée et partage depuis ton téléphone.")}</p>
            <div className="flex items-center justify-center gap-3">
              {storeLinks.googlePlayUrl ? (
                <a
                  href={storeLinks.googlePlayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Google Play"
                  className="landing-chip-hover inline-block"
                >
                  <GooglePlayLogo />
                </a>
              ) : null}
              {storeLinks.appStoreUrl ? (
                <a
                  href={storeLinks.appStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="App Store"
                  className="landing-chip-hover inline-block"
                >
                  <AppleLogo />
                </a>
              ) : null}
            </div>
          </Reveal>
        </section>
      ) : null}

      {occasions.length ? (
        <section className="landing-section-waves px-4 py-10">
          <Reveal className="text-center mb-6">
            <h2 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Pour toutes les occasions")}</h2>
          </Reveal>
          <div className="grid grid-cols-4 gap-3">
            {occasions.slice(0, 8).map((o, i) => (
              <Reveal key={o.id} delay={i * 40}>
                <div
                  className={`landing-card-hover border rounded-xl p-3 text-center flex flex-col items-center gap-1.5 ${OCCASION_TINTS[i % OCCASION_TINTS.length]}`}
                >
                  <span className="text-2xl">{o.emoji}</span>
                  <span className="text-xs font-semibold text-foreground">{o.label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {librarySongs.length ? (
        <section id="bibliotheque" className="landing-section-soft px-4 py-10">
          <Reveal className="text-center mb-6">
            <h2 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Bibliothèque populaire")}</h2>
            <p className="text-sm text-muted-foreground">{t("Les chansons les plus écoutées")}</p>
          </Reveal>
          <div className="flex flex-col gap-3">
            {librarySongs.map((s, i) => (
              <Reveal key={s.slug} delay={i * 80}>
                <LandingLibraryCard
                  song={s}
                  size="sm"
                  labels={{
                    listen: t("Écouter"),
                    listenTitle: t("Écouter {title}"),
                    playing: t("En lecture"),
                    pause: t("Mettre en pause"),
                  }}
                />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {musicStyles.length ? (
        <section className="landing-section-cross px-4 py-10">
          <Reveal className="text-center mb-6">
            <h2 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Tous les styles africains")}</h2>
          </Reveal>
          <Reveal className="flex flex-wrap gap-2 justify-center" delay={100}>
            {musicStyles.map((s, i) => (
              <span
                key={s.id}
                className={`landing-chip-hover px-4 py-2 rounded-xl text-sm font-semibold border ${i < 4 ? "bg-secondary text-primary border-primary/30" : "bg-card text-foreground border-border"}`}
              >
                {s.label}
              </span>
            ))}
          </Reveal>
        </section>
      ) : null}

      <section id="faq" className="landing-section-dotted px-4 py-10">
        <Reveal className="text-center mb-6">
          <h2 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Questions fréquentes")}</h2>
        </Reveal>
        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <LandingFaqItem question={f.q} answer={f.a} compact />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-final-cta px-4 py-14 text-center">
        <Reveal>
          <h2 className="font-headings font-bold text-2xl text-white mb-3">{t("Prêt à créer ta chanson ?")}</h2>
          <p className="text-sm text-white/85 mb-6">
            {t("Rejoins des milliers de personnes qui ont offert de la musique personnalisée.")}
          </p>
          <Link
            href="/register"
            className="cta-glow cta-invert px-8 py-3.5 rounded-xl font-bold text-base inline-block"
          >
            {t("Créer ma chanson maintenant")}
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-border px-4 py-6 text-center flex flex-col items-center">
        <AppLogo size="sm" />
        <p className="text-xs text-muted-foreground mt-3 mb-3">{t("© 2026 MusikPro. Tous droits réservés.")}</p>
        <div className="flex items-center justify-center gap-5">
          <Link href="/privacy" className="text-xs text-muted-foreground">
            {t("Confidentialité")}
          </Link>
          <Link href="/terms" className="text-xs text-muted-foreground">
            {t("Conditions")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
