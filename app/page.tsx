import { primeOverlay } from "@/lib/i18n/overlay-server";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/site";
import { FUNNEL_EVENT, writeFunnelEvent } from "@/lib/analytics/funnel";
import { getSession } from "@/lib/auth/session";
import {
  localizeFieldForLocale,
  translateForLocale,
  translateTemplateForLocale,
  type Locale,
} from "@/lib/i18n/translate";
import { getActiveOccasions } from "@/lib/occasions/server";
import { getActiveMusicStyles } from "@/lib/music-styles/server";
import { CREDITS_PER_GENERATION, VERSIONS_PER_GENERATION } from "@/lib/credit-plans/catalog";
import { getLandingLibrarySongs, getLandingShowcaseSongs } from "@/lib/landing-features/server";
import { getActiveHeroAnimatedTexts } from "@/lib/hero-animated-texts/server";
import { getHeroSettings } from "@/lib/hero-animation/settings";
import { getStoreLinks } from "@/lib/settings/store-links";
import { getActiveLanguageCatalog } from "@/lib/languages/server";
import { detectCurrency } from "@/lib/languages/detection";
import {
  readLanguagePreference,
  readRequestLocale,
  resolveInterfaceLanguage,
  resolveUrlLanguage,
} from "@/lib/languages/preference";
import { splitLocalePrefix, withLocalePrefix } from "@/lib/languages/locale-path";
import LanguageCookieSync from "@/components/banani/LanguageCookieSync";
import LandingPageMobile from "@/components/banani/LandingPageMobile";
import LandingPageDesktop from "@/components/banani/LandingPageDesktop";
import SmoothScroll from "@/components/banani/SmoothScroll";
import LandingNavScrollEffect from "@/components/banani/LandingNavScrollEffect";
import "./dashboard/banani.css";

const SUPPORTED_LOCALES = ["fr", "en", "es", "pt"] as const;
function toSupportedLocale(code: string | undefined): Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(code ?? "") ? (code as Locale) : "fr";
}

function isLandingReferer(referer: string | null): boolean {
  if (!referer) return false;
  try {
    return splitLocalePrefix(new URL(referer).pathname).path === "/";
  } catch {
    return false;
  }
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

  const requestHeaders = await headers();

  const urlLocaleCode = await readRequestLocale();

  // Reuses the SaaS's existing geo-IP language/currency detection (country.is behind the
  // Vercel country header fast-path + Upstash cache — see lib/languages/detection.ts), the
  // same system already wired into app/dashboard/layout.tsx, instead of a second mechanism.
  // languageCatalog is fetched here (not awaited inline) so it runs concurrently with the rest of
  // the batch below, even though detectInterfaceLanguage needs its resolved value — that tail
  // await is unavoidable (it's a real data dependency), but resolveLocalizationSettings/
  // resolveVisitorCountryCode are memoized via React's cache() from the detectCurrency call in the
  // same batch, so it only adds the cost of one indexed country_languages lookup, not a repeat of
  // any geo-IP/network work.
  // An explicit choice (cookie) makes the geo-IP guess useless: read it first to skip that work.
  const cookieLanguageCode = await readLanguagePreference();
  const languageCatalogPromise = getActiveLanguageCatalog();
  // detectCurrency's return value isn't needed here anymore (it only ever fed the removed
  // pricing section), but the call itself stays in this batch: it's what warms the request-scoped
  // geo-IP memoization (see comment above) that detectInterfaceLanguage below reuses.
  const [
    occasions,
    musicStyles,
    showcaseSongs,
    librarySongs,
    heroAnimatedTexts,
    heroSettings,
    storeLinks,
    languageCatalog,
  ] = await Promise.all([
    getActiveOccasions(),
    getActiveMusicStyles(),
    getLandingShowcaseSongs(),
    getLandingLibrarySongs(),
    getActiveHeroAnimatedTexts(),
    getHeroSettings(),
    getStoreLinks(),
    languageCatalogPromise,
    cookieLanguageCode || urlLocaleCode ? Promise.resolve(null) : detectCurrency(requestHeaders),
  ]);

  // Language comes from the URL prefix (`/en`, `/pt`…). An unknown/disabled code is a 404; an
  // un-prefixed `/` redirects to the visitor's language (saved choice, else geo-IP, else default),
  // so every language has its own canonical URL.
  const urlLanguage = resolveUrlLanguage(urlLocaleCode, languageCatalog.interfaceLanguages);
  if (urlLanguage === null) notFound();
  const activeLanguage =
    urlLanguage ??
    (await resolveInterfaceLanguage(requestHeaders, languageCatalog.interfaceLanguages, cookieLanguageCode));
  if (!urlLanguage) redirect(withLocalePrefix("/", activeLanguage?.code ?? "fr"));

  // The visit is recorded after the response is sent (never blocks rendering), once per real page
  // view. Switching language navigates in place (RSC request whose referer is the landing itself):
  // that is not a new visit, so it is not counted.
  const isLanguageSwitch = requestHeaders.get("rsc") === "1" && isLandingReferer(requestHeaders.get("referer"));
  if (!isLanguageSwitch) after(() => writeFunnelEvent({ event: FUNNEL_EVENT.SITE_VISIT }));

  const locale = toSupportedLocale(activeLanguage?.code);
  await primeOverlay(locale);
  const t = (text: string) => translateForLocale(text, locale);
  const translateTemplate = (text: string, params: Record<string, string | number>) =>
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

  const versionsLabel = translateTemplate("1 génération = {versions} versions", { versions: VERSIONS_PER_GENERATION });
  const creditsExplainerLabel = translateTemplate(
    "Chaque chanson complète ({versions} versions) coûte {cost} crédits.",
    {
      versions: VERSIONS_PER_GENERATION,
      cost: CREDITS_PER_GENERATION,
    },
  );

  const landingProps = {
    t,
    versionsLabel,
    creditsExplainerLabel,
    languageFlag,
    languageLabel,
    languageOptions,
    occasions: landingOccasions,
    musicStyles: landingMusicStyles,
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
      <LanguageCookieSync code={activeLanguage?.code ?? "fr"} />
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
