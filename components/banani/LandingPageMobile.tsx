import Link from "next/link";
import AppLogo from "./AppLogo";
import Icon from "./Icon";
import Reveal from "./Reveal";
import { GooglePlayLogo, AppleLogo } from "./StoreDownloadCard";
import LandingLanguageSwitcher, { type LandingLanguageOption } from "./LandingLanguageSwitcher";
import MobileLandingMenu from "./MobileLandingMenu";
import HeroRotatingText, { type HeroRotatingTextItem } from "./HeroRotatingText";
import LandingInlinePlayButton from "./LandingInlinePlayButton";
import { HERO_TEXT_SIZE_CLASSES, type HeroAnimationType, type HeroTextSize } from "@/lib/hero-animation/types";
import type { LandingFeaturedSong } from "@/lib/landing-features/server";

export type LandingOccasion = { id: string; emoji: string; label: string };
export type LandingHeroText = HeroRotatingTextItem;
export type LandingStyle = { id: string; label: string };
export type LandingCreditPlan = {
  id: string;
  name: string;
  songsLabel: string;
  priceLabel: string;
  perSongLabel: string;
  badge: string | null;
  highlight: boolean;
};
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
  creditPlans: LandingCreditPlan[];
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
function AnimatedHeadline({ text, className, baseDelay = 0 }: { text: string; className?: string; baseDelay?: number }) {
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
  creditPlans,
  showcaseSongs,
  librarySongs,
  heroHeadline,
  heroTexts,
  heroAnimationType,
  heroTextSize,
  storeLinks,
}: Props) {
  const steps = [
    { num: "01", icon: "📝", title: t("Raconte ton histoire"), desc: t("Écris ou parle de ta personne, son prénom, ses qualités, ce moment spécial.") },
    { num: "02", icon: "🎵", title: t("Choisis ton style"), desc: t("Afrobeat, Gospel, Amapiano… choisis l'ambiance qui te correspond.") },
    { num: "03", icon: "🎧", title: t("Reçois 2 versions"), desc: t("1 crédit = 2 versions uniques de ta chanson, prêtes à télécharger.") },
  ];
  const faqs = [
    { q: t("Comment fonctionne la génération ?"), a: t("Tu décris ton histoire, choisis un style et une ambiance, et notre IA compose une chanson unique avec des paroles personnalisées.") },
    { q: t("Combien de versions vais-je recevoir ?"), a: `${versionsLabel}. ${t("Tu gardes les deux !")}` },
    { q: t("Puis-je modifier les paroles ?"), a: t("Oui ! Avant la génération musicale, tu peux lire et modifier les paroles générées par l'IA.") },
    { q: t("Comment fonctionnent les crédits ?"), a: `${creditsExplainerLabel} ${t("Tu achètes des crédits en packs selon tes besoins.")}` },
    { q: t("Puis-je publier ma chanson ?"), a: t("Oui, tu peux publier une version dans notre bibliothèque publique.") },
    { q: t("Dans quelle langue puis-je créer ma chanson ?"), a: t("Tu choisis la langue des paroles et la voix avant la génération, parmi plusieurs langues disponibles.") },
  ];
  const navLinks = [
    { href: "#accueil", label: t("Accueil") },
    { href: "#exemples", label: t("Créations") },
    { href: "#comment-ca-marche", label: t("Comment ça marche") },
    { href: "#tarifs", label: t("Tarifs") },
    { href: "#faq", label: t("FAQ") },
  ];

  return (
    <div className="landing-page bg-background font-body text-foreground">
      <nav className="landing-nav relative border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <a href="#accueil" aria-label={t("Accueil")}>
          <AppLogo size="sm" />
        </a>
        <div className="flex items-center gap-2 ml-auto">
          <LandingLanguageSwitcher languages={languageOptions} currentFlag={languageFlag} currentLabel={languageLabel} compact />
          <Link href="/login" className="landing-nav-cta px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg">
            {t("Connexion")}
          </Link>
          <MobileLandingMenu links={navLinks} menuLabel={t("Menu")} closeLabel={t("Fermer")} />
        </div>
      </nav>

      <section id="accueil" className="hero-glow relative flex flex-col items-center justify-center text-center px-5 pt-12 pb-16 overflow-hidden">
        <div className="hero-orb" style={{ width: 200, height: 200, top: -50, left: -60, background: "radial-gradient(circle, rgba(242,101,34,0.35), transparent 70%)" }} />
        <div className="hero-orb" style={{ width: 220, height: 220, bottom: -60, right: -60, background: "radial-gradient(circle, rgba(244,132,95,0.30), transparent 70%)", animationDelay: "2s" }} />

        <div className="hero-float absolute left-3 top-24 w-10 h-10 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center backdrop-blur">
          <Icon i="music" size={18} className="text-white/70" />
        </div>
        <div className="hero-float absolute right-3 top-24 w-10 h-10 bg-white/15 border border-white/25 rounded-xl flex items-center justify-center backdrop-blur" style={{ animationDelay: "1.2s" }}>
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
        <Link href="/register" className="cta-glow bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-2 mb-5">
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
          <div className="grid grid-cols-2 gap-3">
            {showcaseSongs.map((s, i) => (
              <Reveal key={s.slug} delay={i * 90}>
                <Link href={`/s/${s.slug}`} className="landing-card-hover rounded-2xl overflow-hidden relative aspect-square group block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.coverUrl ?? undefined} alt={s.title} className="w-full h-full object-cover" style={{ aspectRatio: "1 / 1" }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-between p-3">
                    {s.audioUrl ? (
                      <LandingInlinePlayButton audioUrl={s.audioUrl} title={s.title} compact className="self-end" />
                    ) : null}
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-sm text-white">{s.title}</p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {storeLinks.googlePlayUrl || storeLinks.appStoreUrl ? (
        <section className="landing-section-grid px-4 py-10 text-center">
          <Reveal>
            <h2 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Emporte ta musique partout")}</h2>
            <p className="text-sm text-muted-foreground mb-8">{t("Crée et partage depuis ton téléphone.")}</p>
            <div className="flex items-center justify-center gap-3">
              {storeLinks.googlePlayUrl ? (
                <a href={storeLinks.googlePlayUrl} target="_blank" rel="noopener noreferrer" aria-label="Google Play" className="landing-chip-hover inline-block">
                  <GooglePlayLogo />
                </a>
              ) : null}
              {storeLinks.appStoreUrl ? (
                <a href={storeLinks.appStoreUrl} target="_blank" rel="noopener noreferrer" aria-label="App Store" className="landing-chip-hover inline-block">
                  <AppleLogo />
                </a>
              ) : null}
            </div>
          </Reveal>
        </section>
      ) : null}

      <section id="comment-ca-marche" className="landing-section-dotted relative overflow-hidden px-4 py-10">
        <div className="hero-orb" style={{ width: 180, height: 180, top: -40, right: -50, background: "radial-gradient(circle, rgba(242,101,34,0.18), transparent 70%)" }} />
        <Reveal className="text-center mb-8">
          <h2 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Comment ça marche ?")}</h2>
          <p className="text-sm text-muted-foreground">{t("3 étapes simples pour ta chanson")}</p>
        </Reveal>
        <div className="flex flex-col gap-6">
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 100}>
              <div className="landing-card-hover flex items-start gap-4 bg-card border border-border rounded-2xl p-4">
                <div className="landing-icon-gradient w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">{step.icon}</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{step.num}</div>
                  <h3 className="font-headings font-bold text-base text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {occasions.length ? (
        <section className="landing-section-waves px-4 py-10">
          <Reveal className="text-center mb-6">
            <h2 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Pour toutes les occasions")}</h2>
          </Reveal>
          <div className="grid grid-cols-4 gap-3">
            {occasions.slice(0, 8).map((o, i) => (
              <Reveal key={o.id} delay={i * 40}>
                <div className={`landing-card-hover border rounded-xl p-3 text-center flex flex-col items-center gap-1.5 ${OCCASION_TINTS[i % OCCASION_TINTS.length]}`}>
                  <span className="text-2xl">{o.emoji}</span>
                  <span className="text-xs font-semibold text-foreground">{o.label}</span>
                </div>
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

      {librarySongs.length ? (
        <section className="landing-section-grid px-4 py-10">
          <Reveal className="text-center mb-6">
            <h2 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Bibliothèque populaire")}</h2>
            <p className="text-sm text-muted-foreground">{t("Les chansons les plus écoutées")}</p>
          </Reveal>
          <div className="flex flex-col gap-3">
            {librarySongs.map((s, i) => (
              <Reveal key={s.slug} delay={i * 80}>
                <Link href={`/s/${s.slug}`} className="landing-card-hover bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className="landing-icon-gradient w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon i="music-2" size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{s.title}</p>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Icon i="headphones" size={10} /> {s.plays}
                    </span>
                  </div>
                  {s.audioUrl ? (
                    <LandingInlinePlayButton audioUrl={s.audioUrl} title={s.title} compact className="flex-shrink-0" />
                  ) : null}
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {creditPlans.length ? (
        <section id="tarifs" className="landing-section-waves relative overflow-hidden px-4 py-10">
          <div className="hero-orb" style={{ width: 200, height: 200, bottom: -60, left: -60, background: "radial-gradient(circle, rgba(244,132,95,0.20), transparent 70%)" }} />
          <Reveal className="text-center mb-6">
            <h2 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Tarifs simples")}</h2>
          </Reveal>
          <div className="flex flex-col gap-6">
            {creditPlans.map((pack, i) => {
              const features = [
                pack.songsLabel,
                t("2 versions par génération"),
                t("Téléchargement MP3"),
                t("Partage WhatsApp"),
                t("Paiement Mobile Money"),
              ];
              return (
                <Reveal key={pack.id} delay={i * 100}>
                  <div className={`landing-pricing-card landing-card-hover relative rounded-2xl pt-9 pb-7 px-6 text-center ${pack.highlight ? "landing-pricing-highlight" : "bg-card border border-border"}`}>
                    <span
                      className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${pack.highlight ? "bg-white/20 text-white backdrop-blur" : "bg-primary text-primary-foreground"}`}
                    >
                      {pack.name}
                    </span>
                    <p className={`text-sm mb-3 ${pack.highlight ? "text-white/80" : "text-muted-foreground"}`}>{pack.songsLabel}</p>
                    <div className={`border-t mb-4 ${pack.highlight ? "border-white/20" : "border-border"}`} />
                    <p className={`font-black text-3xl mb-1 ${pack.highlight ? "text-white" : "text-foreground"}`}>{pack.priceLabel}</p>
                    {pack.badge ? (
                      <div className="flex justify-center mb-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${pack.highlight ? "bg-white/20 text-white" : "bg-success text-white"}`}>{pack.badge}</span>
                      </div>
                    ) : (
                      <p className={`text-sm font-semibold mb-4 ${pack.highlight ? "text-white/85" : "text-success"}`}>{pack.perSongLabel}</p>
                    )}
                    <ul className="flex flex-col gap-2.5 mb-6 text-left">
                      {features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${pack.highlight ? "bg-white text-primary" : "bg-primary text-primary-foreground"}`}>
                            <Icon i="check" size={12} />
                          </span>
                          <span className={`text-sm ${pack.highlight ? "text-white/90" : "text-foreground"}`}>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/register"
                      className={`cta-glow block w-full py-3 rounded-full font-bold text-sm ${pack.highlight ? "cta-invert" : "bg-primary text-primary-foreground"}`}
                    >
                      {t("Choisir ce pack")}
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      ) : null}

      <section id="faq" className="landing-section-dotted px-4 py-10">
        <Reveal className="text-center mb-6">
          <h2 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Questions fréquentes")}</h2>
        </Reveal>
        <div className="flex flex-col gap-4">
          {faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <div className="landing-card-hover bg-card border border-border rounded-xl p-4">
                <p className="font-bold text-sm text-foreground mb-2">{f.q}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-final-cta px-4 py-14 text-center">
        <Reveal>
          <h2 className="font-headings font-bold text-2xl text-white mb-3">{t("Prêt à créer ta chanson ?")}</h2>
          <p className="text-sm text-white/85 mb-6">{t("Rejoins des milliers de personnes qui ont offert de la musique personnalisée.")}</p>
          <Link href="/register" className="cta-glow cta-invert px-8 py-3.5 rounded-xl font-bold text-base inline-block">
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
