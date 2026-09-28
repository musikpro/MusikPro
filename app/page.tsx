import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LANDING_LANGUAGE_COOKIE } from "@/lib/languages/landing-language-cookie";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site";
import { FUNNEL_EVENT, writeFunnelEvent } from "@/lib/analytics/funnel";
import { getSession } from "@/lib/auth/session";
import { localizeFieldForLocale, translateForLocale, translateTemplateForLocale, type Locale } from "@/lib/i18n/translate";
import { getActiveOccasions } from "@/lib/occasions/server";
import { getActiveMusicStyles } from "@/lib/music-styles/server";
import { getActiveCreditPlans } from "@/lib/credit-plans/server";
import { CREDITS_PER_GENERATION, VERSIONS_PER_GENERATION, getGenerationCount } from "@/lib/credit-plans/catalog";
import { formatCreditPrice } from "@/lib/credit-plans/currency";
import { getLandingLibrarySongs, getLandingShowcaseSongs } from "@/lib/landing-features/server";
import { getActiveHeroAnimatedTexts } from "@/lib/hero-animated-texts/server";
import { getHeroSettings } from "@/lib/hero-animation/settings";
import { getStoreLinks } from "@/lib/settings/store-links";
import { getActiveLanguageCatalog } from "@/lib/languages/server";
import { detectCurrency, detectInterfaceLanguage } from "@/lib/languages/detection";
import LandingPageMobile from "@/components/banani/LandingPageMobile";
import LandingPageDesktop from "@/components/banani/LandingPageDesktop";
import SmoothScroll from "@/components/banani/SmoothScroll";
import LandingNavScrollEffect from "@/components/banani/LandingNavScrollEffect";
import "./dashboard/banani.css";

const SUPPORTED_LOCALES = ["fr", "en", "es", "pt"] as const;
function toSupportedLocale(code: string | undefined): Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(code ?? "") ? (code as Locale) : "fr";
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  description: siteConfig.description,
  path: "/",
});

/**
 * Public marketing home page — always the real landing page, in every environment (the
 * generic kit readiness dashboard now lives at /setup, gated to non-production there; see
 * app/setup/page.tsx and the matching check in scripts/security-check.mjs).
 */
export default async function Home() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  await writeFunnelEvent({ event: FUNNEL_EVENT.SITE_VISIT });

  const requestHeaders = await headers();

  // Reuses the SaaS's existing geo-IP language/currency detection (country.is behind the
  // Vercel country header fast-path + Upstash cache — see lib/languages/detection.ts), the
  // same system already wired into app/dashboard/layout.tsx, instead of a second mechanism.
  // languageCatalog is fetched here (not awaited inline) so it runs concurrently with the rest of
  // the batch below, even though detectInterfaceLanguage needs its resolved value — that tail
  // await is unavoidable (it's a real data dependency), but resolveLocalizationSettings/
  // resolveVisitorCountryCode are memoized via React's cache() from the detectCurrency call in the
  // same batch, so it only adds the cost of one indexed country_languages lookup, not a repeat of
  // any geo-IP/network work.
  const languageCatalogPromise = getActiveLanguageCatalog();
  const [
    occasions,
    musicStyles,
    creditPlans,
    showcaseSongs,
    librarySongs,
    heroAnimatedTexts,
    heroSettings,
    storeLinks,
    languageCatalog,
    currency,
  ] = await Promise.all([
    getActiveOccasions(),
    getActiveMusicStyles(),
    getActiveCreditPlans(),
    getLandingShowcaseSongs(),
    getLandingLibrarySongs(),
    getActiveHeroAnimatedTexts(),
    getHeroSettings(),
    getStoreLinks(),
    languageCatalogPromise,
    detectCurrency(requestHeaders),
  ]);
  const detectedLanguage = await detectInterfaceLanguage(requestHeaders, languageCatalog.interfaceLanguages);

  // A visitor who explicitly switched language via LandingLanguageSwitcher takes priority over
  // the geo-IP guess (cookie set by setLandingLanguage in lib/languages/landing-language-action.ts).
  const cookieStore = await cookies();
  const cookieLanguageCode = cookieStore.get(LANDING_LANGUAGE_COOKIE)?.value;
  const cookieLanguage = languageCatalog.interfaceLanguages.find((language) => language.code === cookieLanguageCode);
  const activeLanguage = cookieLanguage ?? detectedLanguage;

  const locale = toSupportedLocale(activeLanguage?.code);
  const t = (text: string) => translateForLocale(text, locale);
  const tt = (text: string, params: Record<string, string | number>) =>
    translateTemplateForLocale(text, params, locale);
  const languageFlag = activeLanguage?.flag ?? "🇫🇷";
  const languageLabel = (activeLanguage?.code ?? "fr").toUpperCase();
  const languageOptions = languageCatalog.interfaceLanguages.map((language) => ({
    code: language.code,
    flag: language.flag,
    nativeName: language.nativeName,
  }));

  const landingOccasions = occasions.map((o) => ({
    id: o.id,
    emoji: o.emoji,
    label: localizeFieldForLocale(o.name, o.translations, "name", locale),
  }));
  const landingMusicStyles = musicStyles.map((s) => ({
    id: s.id,
    label: localizeFieldForLocale(s.name, s.translations, "name", locale),
  }));
  const landingHeroTexts = heroAnimatedTexts.map((text) => ({
    id: text.id,
    emoji: text.emoji,
    label: localizeFieldForLocale(text.label, text.translations, "label", locale),
  }));
  const heroHeadline = localizeFieldForLocale(heroSettings.headline, heroSettings.translations, "headline", locale);
  const displayCurrency = currency ?? "XOF";
  const landingCreditPlans = creditPlans.slice(0, 3).map((plan) => {
    const songs = getGenerationCount(plan.credits, plan.generationCost);
    const perSong = songs > 0 ? plan.priceValue / songs : plan.priceValue;
    return {
      id: plan.id,
      name: localizeFieldForLocale(plan.name, plan.translations, "name", locale),
      songsLabel: tt("{count} chansons", { count: songs }),
      priceLabel: formatCreditPrice(plan.priceValue, displayCurrency),
      perSongLabel: tt("{price} / chanson", { price: formatCreditPrice(perSong, displayCurrency) }),
      badge: plan.popular
        ? t("Le plus choisi")
        : plan.bonus
          ? localizeFieldForLocale(plan.bonus, plan.translations, "bonus", locale)
          : null,
      highlight: plan.popular,
    };
  });

  const versionsLabel = tt("1 génération = {versions} versions", { versions: VERSIONS_PER_GENERATION });
  const creditsExplainerLabel = tt("Chaque chanson complète ({versions} versions) coûte {cost} crédits.", {
    versions: VERSIONS_PER_GENERATION,
    cost: CREDITS_PER_GENERATION,
  });

  const landingProps = {
    t,
    versionsLabel,
    creditsExplainerLabel,
    languageFlag,
    languageLabel,
    languageOptions,
    occasions: landingOccasions,
    musicStyles: landingMusicStyles,
    creditPlans: landingCreditPlans,
    showcaseSongs,
    librarySongs,
    heroHeadline,
    heroTexts: landingHeroTexts,
    heroAnimationType: heroSettings.animationType,
    heroTextSize: heroSettings.textSize,
    storeLinks,
  };

  return (
    <>
      <SmoothScroll />
      <LandingNavScrollEffect />
      <div className="banani-mobile">
        <LandingPageMobile {...landingProps} />
      </div>
      <div className="banani-desktop">
        <LandingPageDesktop {...landingProps} />
      </div>
    </>
  );
}
