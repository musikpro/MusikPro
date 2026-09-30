import Link from "next/link";
import AppLogo from "./AppLogo";
import Icon from "./Icon";
import Reveal from "./Reveal";
import { GooglePlayLogo, AppleLogo } from "./StoreDownloadCard";
import LandingLanguageSwitcher, { type LandingLanguageOption } from "./LandingLanguageSwitcher";
import HeroRotatingText from "./HeroRotatingText";
import LandingSongCarousel from "./LandingSongCarousel";
import LandingLibraryCard from "./LandingLibraryCard";
import ExclusiveAudioPlayback from "./ExclusiveAudioPlayback";
import { HERO_TEXT_SIZE_CLASSES, type HeroAnimationType, type HeroTextSize } from "@/lib/hero-animation/types";
import type { LandingHeroText, LandingOccasion, LandingStyle, LandingTrendingSong } from "./LandingPageMobile";

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

export default function LandingPageDesktop({
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
      a: t(
        "Tu décris ton histoire, choisis un style et une ambiance, et notre IA compose une chanson unique avec des paroles personnalisées.",
      ),
    },
    { q: t("Combien de versions vais-je recevoir ?"), a: `${versionsLabel}. ${t("Tu gardes les deux !")}` },
    {
      q: t("Puis-je modifier les paroles ?"),
      a: t("Oui ! Avant la génération musicale, tu peux lire et modifier les paroles générées par l'IA."),
    },
    {
      q: t("Comment fonctionnent les crédits ?"),
      a: `${creditsExplainerLabel} ${t("Tu achètes des crédits en packs selon tes besoins.")}`,
    },
    {
      q: t("Puis-je publier ma chanson ?"),
      a: t("Oui, tu peux publier une version dans notre bibliothèque publique."),
    },
    {
      q: t("Dans quelle langue puis-je créer ma chanson ?"),
      a: t("Tu choisis la langue des paroles et la voix avant la génération, parmi plusieurs langues disponibles."),
    },
  ];
  return (
    <div className="landing-page bg-background font-body text-foreground flex flex-col min-h-screen">
      <ExclusiveAudioPlayback />
      <nav className="landing-nav border-b border-border px-10 py-4 flex items-center justify-between">
        <a href="#accueil-desktop" aria-label={t("Accueil")}>
          <AppLogo size="md" />
        </a>
        <div className="flex items-center gap-8">
          <a href="#accueil-desktop" className="landing-nav-link text-base text-muted-foreground font-medium">
            {t("Accueil")}
          </a>
          <a href="#exemples-desktop" className="landing-nav-link text-base text-muted-foreground font-medium">
            {t("Réalisations")}
          </a>
          <a href="#bibliotheque-desktop" className="landing-nav-link text-base text-muted-foreground font-medium">
            {t("Bibliothèque")}
          </a>
          <a href="#faq-desktop" className="landing-nav-link text-base text-muted-foreground font-medium">
            {t("FAQ")}
          </a>
        </div>
        <div className="flex items-center gap-4">
          <LandingLanguageSwitcher
            languages={languageOptions}
            currentFlag={languageFlag}
            currentLabel={languageLabel}
          />
          <Link
            href="/login"
            className="landing-nav-cta px-5 py-2.5 bg-primary text-primary-foreground font-semibold text-sm rounded-lg"
          >
            {t("Connexion")}
          </Link>
        </div>
      </nav>

      {/* min-h matches the viewport minus the ~72px nav bar above (landing-nav's measured height),
          so the gradient covers the whole first screen instead of leaving a white gap below it. */}
      <section
        id="accueil-desktop"
        className="hero-glow relative w-full flex items-center justify-center overflow-hidden pt-12 pb-12 min-h-[calc(100dvh-72px)]"
      >
        <div
          className="hero-orb"
          style={{
            width: 360,
            height: 360,
            top: -100,
            left: -120,
            background: "radial-gradient(circle, rgba(242,101,34,0.30), transparent 70%)",
          }}
        />
        <div
          className="hero-orb"
          style={{
            width: 420,
            height: 420,
            bottom: -140,
            right: -140,
            background: "radial-gradient(circle, rgba(244,132,95,0.26), transparent 70%)",
            animationDelay: "2.4s",
          }}
        />

        <div className="relative text-center max-w-5xl px-8">
          <div className="hero-float absolute flex flex-col gap-20" style={{ top: 30, left: -90 }}>
            <div className="w-14 h-14 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center backdrop-blur">
              <Icon i="music" size={28} className="text-white/70" />
            </div>
          </div>
          <div
            className="hero-float absolute flex flex-col gap-20"
            style={{ top: 150, left: -110, animationDelay: "1.4s" }}
          >
            <div className="w-12 h-12 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center backdrop-blur">
              <Icon i="headphones" size={20} className="text-white/70" />
            </div>
          </div>
          <div
            className="hero-float absolute flex flex-col gap-20"
            style={{ top: 30, right: -90, animationDelay: "0.8s" }}
          >
            <div className="w-12 h-12 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center backdrop-blur">
              <Icon i="star" size={20} className="text-white/70" />
            </div>
          </div>
          <div
            className="hero-float absolute flex flex-col gap-20"
            style={{ top: 150, right: -110, animationDelay: "2s" }}
          >
            <div className="w-14 h-14 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center backdrop-blur">
              <Icon i="music-2" size={28} className="text-white/70" />
            </div>
          </div>

          <div className="hero-badge inline-flex items-center gap-2 bg-white/15 text-white px-5 py-2.5 rounded-xl text-sm font-semibold mb-6 backdrop-blur border border-white/25">
            <span className="hero-badge-dot w-2 h-2 rounded-full bg-white inline-block" />
            <span>{t("L'émotion en musique")}</span>
          </div>
          <AnimatedHeadline
            text={heroHeadline}
            className="font-headings font-bold text-6xl text-white leading-tight mb-3"
            baseDelay={250}
          />
          <HeroRotatingText
            texts={heroTexts}
            animationType={heroAnimationType}
            className={`font-bold text-white/90 mb-6 ${HERO_TEXT_SIZE_CLASSES[heroTextSize].desktop}`}
          />
          <p className="hero-badge text-xl text-white/85 mb-8 leading-relaxed" style={{ animationDelay: "800ms" }}>
            {t("Raconte-nous ton histoire, choisis ton style, et reçois deux versions uniques de ta chanson.")}
          </p>
          <div className="hero-badge flex items-center justify-center gap-2 mb-8" style={{ animationDelay: "900ms" }}>
            <div className="w-2 h-2 rounded-full bg-white"></div>
            <span className="text-lg font-semibold text-white">{versionsLabel}</span>
          </div>
          <div className="flex items-center justify-center mb-8">
            <Link
              href="/register"
              className="cta-glow bg-primary text-primary-foreground px-14 py-4 rounded-xl font-bold text-lg flex items-center gap-2"
            >
              <Icon i="music-2" size={24} /> {t("Créer ma chanson")}
            </Link>
          </div>
          <p className="text-base text-white/70">{t("Paiement Mobile Money")}</p>
        </div>
      </section>

      {showcaseSongs.length ? (
        <section id="exemples-desktop" className="landing-section-diagonal px-10 py-20">
          <Reveal className="text-center mb-12">
            <h2 className="font-headings font-bold text-4xl text-foreground mb-3">{t("Ils ont créé avec MusikPro")}</h2>
            <p className="text-lg text-muted-foreground">{t("Écoutez des chansons créées pour des moments uniques")}</p>
          </Reveal>
          <LandingSongCarousel
            songs={showcaseSongs}
            labels={{ listen: t("Écouter"), navigation: t("Navigation des chansons") }}
          />
        </section>
      ) : null}

      {storeLinks.googlePlayUrl || storeLinks.appStoreUrl ? (
        <section className="landing-section-grid px-10 py-16 text-center">
          <Reveal>
            <h2 className="font-headings font-bold text-4xl text-foreground mb-3">{t("Emporte ta musique partout")}</h2>
            <p className="text-lg text-muted-foreground mb-12">
              {t("Crée, écoute et partage tes chansons depuis ton téléphone.")}
            </p>
            <div className="flex items-center justify-center gap-8">
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
        <section className="landing-section-waves px-10 py-20">
          <Reveal className="text-center mb-12">
            <h2 className="font-headings font-bold text-4xl text-foreground mb-3">{t("Pour toutes les occasions")}</h2>
          </Reveal>
          <div className="grid grid-cols-8 gap-3 max-w-5xl mx-auto">
            {occasions.slice(0, 8).map((o, i) => (
              <Reveal key={o.id} delay={i * 50}>
                <div
                  className={`landing-card-hover border rounded-xl p-4 text-center flex flex-col items-center gap-2 ${OCCASION_TINTS[i % OCCASION_TINTS.length]}`}
                >
                  <span className="text-3xl">{o.emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{o.label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {librarySongs.length ? (
        <section id="bibliotheque-desktop" className="landing-section-soft px-10 py-20">
          <Reveal className="text-center mb-12">
            <h2 className="font-headings font-bold text-4xl text-foreground mb-3">{t("Bibliothèque populaire")}</h2>
            <p className="text-lg text-muted-foreground mb-8">{t("Les chansons les plus écoutées de la communauté")}</p>
          </Reveal>
          <div className="flex flex-wrap justify-center gap-5">
            {librarySongs.map((s, i) => (
              <Reveal key={s.slug} delay={i * 90} className="w-72">
                <LandingLibraryCard song={s} size="lg" />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {musicStyles.length ? (
        <section className="landing-section-cross px-10 py-16">
          <Reveal className="text-center mb-10">
            <h2 className="font-headings font-bold text-4xl text-foreground mb-3">
              {t("Tous les styles africains et plus")}
            </h2>
          </Reveal>
          <Reveal className="flex flex-wrap gap-3 justify-center max-w-3xl mx-auto" delay={100}>
            {musicStyles.map((s, i) => (
              <span
                key={s.id}
                className={`landing-chip-hover px-5 py-2.5 rounded-xl text-base font-semibold border ${i < 4 ? "bg-secondary text-primary border-primary/30" : "bg-card text-foreground border-border"}`}
              >
                {s.label}
              </span>
            ))}
          </Reveal>
        </section>
      ) : null}

      <section id="faq-desktop" className="landing-section-dotted px-10 py-20">
        <Reveal className="text-center mb-12">
          <h2 className="font-headings font-bold text-4xl text-foreground mb-3">{t("Questions fréquentes")}</h2>
        </Reveal>
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-6">
          {faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 60} className="h-full">
              <div className="landing-card-hover h-full bg-card border border-border rounded-xl p-6">
                <p className="font-bold text-base text-foreground mb-3">{f.q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-final-cta px-10 py-24 text-center">
        <Reveal>
          <h2 className="font-headings font-bold text-5xl text-white mb-4">{t("Prêt à créer ta chanson ?")}</h2>
          <p className="text-xl text-white/85 mb-10">
            {t("Rejoins des milliers de personnes qui ont déjà offert de la musique personnalisée.")}
          </p>
          <Link href="/register" className="cta-glow cta-invert px-10 py-4 rounded-2xl font-bold text-xl inline-block">
            {t("Créer ma chanson maintenant")}
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-border px-10 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <AppLogo size="sm" />
            <p className="text-sm text-muted-foreground">{t("© 2026 MusikPro. Tous droits réservés.")}</p>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-muted-foreground">
              {t("Confidentialité")}
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground">
              {t("Conditions")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
