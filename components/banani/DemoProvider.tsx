"use client";
import { buildSongTitle } from "@/lib/ai/song-title";
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { demoLibrarySongs, demoDiscoverSongs, demoFavoriteSongs, demoLyrics } from "@/lib/demo/musikpro-data";
import { InlineNotice } from "@/components/ui/inline-notice";
import { authClient } from "@/lib/auth/client";
import { dashboardHref, normalizeDashboardPath } from "@/lib/demo/routing";
import { getWorkspaceDefaults } from "@/lib/demo/workspace-defaults";
import {
  demoCreationChoicesSchema,
  buildDemoPaymentDraftSchema,
  pickInitialPhoneCountry,
} from "@/lib/validation/musikpro-demo";
import { CREDITS_PER_GENERATION, type CreditPlanOption } from "@/lib/credit-plans/catalog";
import { DEFAULT_CURRENCIES, type CreditCurrency, type CreditCurrencyCode } from "@/lib/credit-plans/currency";
import type { OccasionOption } from "@/lib/occasions/catalog";
import type { MoodOption } from "@/lib/moods/catalog";
import type { MusicStyleOption } from "@/lib/music-styles/catalog";
import type { RecipientRelationOption } from "@/lib/recipient-relations/catalog";
import type { DiscoverSong } from "@/lib/discover/types";
import { formatPlays } from "@/lib/trending/format";
import type { LanguageOption } from "@/lib/languages/catalog";
import type { PhonePrefixOption } from "@/lib/phone-prefixes/catalog";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { persistLanguageCookie } from "@/lib/languages/preference-client";
import { withLocalePrefix } from "@/lib/languages/locale-path";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";
import { localizeField, translate as t, translateTemplate, type CatalogTranslations } from "@/lib/i18n/translate";
import type { WorkspaceSong } from "@/lib/demo/song-types";
import type { OccasionFieldClientDefinition } from "@/lib/occasion-fields/types";
import { blockVisibility } from "@/lib/occasion-fields/client";
import { buildOccasionDetails } from "@/lib/occasion-fields/answers";
import type { CreationDraftData } from "@/lib/validation/creation-draft";

export type SongGroupResponse = {
  songGroupId: string;
  title: string;
  occasion: string | null;
  style: string | null;
  lyrics: string | null;
  status: "processing" | "completed" | "failed";
  createdAt: string;
  coverUrl: string | null;
  sharedToDiscover?: boolean;
  versions: Array<{
    jobId: string;
    label: string;
    status: WorkspaceSong["versions"][number]["status"];
    duration: string;
    audioUrl: string | null;
    plays: number;
    liked: boolean;
    failureReason: string | null;
  }>;
};

function mapSongGroup(song: SongGroupResponse): WorkspaceSong {
  return {
    id: song.songGroupId,
    title: song.title,
    occasion: song.occasion || "",
    style: song.style || "",
    date: new Date(song.createdAt).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    createdAt: song.createdAt,
    lyrics: song.lyrics || "",
    status: song.status,
    coverUrl: song.coverUrl,
    sharedToDiscover: Boolean(song.sharedToDiscover),
    versions: song.versions.map((v) => ({
      jobId: v.jobId,
      label: v.label,
      duration: v.duration,
      plays: v.plays,
      liked: v.liked,
      status: v.status,
      audioUrl: v.audioUrl,
      failureReason: v.failureReason,
    })),
  };
}

type DemoProfile = { name: string; email: string; location: string };
type StoreLinks = { googlePlayUrl: string | null; appStoreUrl: string | null; hideInApp: boolean };

function useDemoState(
  mode: "demo" | "real",
  initialProfile: DemoProfile,
  initialBalance: number,
  initialCreditPlans: CreditPlanOption[],
  initialOccasions: OccasionOption[],
  initialMoods: MoodOption[],
  initialMusicStyles: MusicStyleOption[],
  initialRecipientRelations: RecipientRelationOption[],
  initialOccasionFields: Record<string, OccasionFieldClientDefinition[]>,
  initialDiscoverSongs: DiscoverSong[],
  initialInterfaceLanguages: LanguageOption[],
  initialLyricsLanguages: LanguageOption[],
  initialDetectedInterfaceLanguage: LanguageOption | null,
  persistenceId: string,
  paymentBypassEnabled: boolean,
  versionsPerGeneration: number,
  initialPhonePrefixes: PhonePrefixOption[],
  initialDetectedCurrency: CreditCurrencyCode | null,
  currencies: CreditCurrency[],
  initialDetectedCountry: string | null,
  storeLinks: StoreLinks,
  generationRedirectDelaySeconds: number,
  generationPollIntervalMs: number,
  savedPaymentPhone: { phoneLocal: string; phoneCountry: string } | null,
) {
  const router = useRouter();
  const browserPathname = usePathname();
  const isDemo = mode === "demo";
  const defaults = getWorkspaceDefaults(isDemo, initialBalance);
  const pathname = normalizeDashboardPath(browserPathname);
  // Language of the URL (`/en/dashboard/…`): every internal link keeps that prefix.
  const [localeCode, setLocaleCode] = useState<string | null>(initialDetectedInterfaceLanguage?.code ?? null);
  const href = (route: string) => dashboardHref(route, isDemo, localeCode);
  const [message, setMessage] = useState("");
  const notify = (nextMessage: string, options?: { demoOnly?: boolean }) =>
    setMessage(
      options?.demoOnly && !isDemo
        ? t("Cette fonctionnalité sera bientôt disponible dans votre espace MusikPro.")
        : nextMessage,
    );
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);
  const [fields, setFields] = useState<Record<string, string>>({
    story: "",
    recipientName: "",
    recipientPronunciation: "",
    senderName: "",
    senderPronunciation: "",
    lyrics: isDemo ? demoLyrics : "",
    detail: "",
    "profile.name": initialProfile.name,
    "profile.email": initialProfile.email,
    "profile.location": initialProfile.location,
    "support.subject": "",
    "support.category": "Problème technique",
    "support.message": "",
    "support.email": initialProfile.email,
    "support.phone": "",
    "payment.name": initialProfile.name,
    "payment.email": initialProfile.email,
    "payment.phone": "",
  });
  const [choices, setChoices] = useState<Record<string, string>>({
    occasion: "",
    genre: "",
    mood: "",
    language: "",
    voice: "",
    theme: "Clair",
    appLanguage: "Français",
    currency: "XOF",
    phoneCountry: pickInitialPhoneCountry(initialDetectedCountry, initialPhonePrefixes),
    recipientRelation: "",
  });
  const [details, setDetails] = useState<Record<string, string>>({});
  const currentOccasion = initialOccasions.find((occasion) => occasion.name === choices.occasion);
  const occasionFields = currentOccasion ? (initialOccasionFields[currentOccasion.id] ?? []) : [];
  const occasionBlocks = blockVisibility(currentOccasion);
  const setDetail = (fieldId: string, value: string) => setDetails((prev) => ({ ...prev, [fieldId]: value }));
  const [creationDraftReady, setCreationDraftReady] = useState(false);
  const creationDraftKey = `musikpro:creation-draft:v1:${persistenceId}`;
  const paymentInfoKey = `musikpro:payment-info:v1:${persistenceId}`;
  // Le client a choisi lui-même l'indicatif (sinon il suit le pays détecté).
  const phoneCountryChosen = useRef(false);
  const persistPaymentInfo = (nextFields: Record<string, string>, phoneCountry: string) => {
    try {
      window.localStorage.setItem(
        paymentInfoKey,
        JSON.stringify({
          name: nextFields["payment.name"] ?? "",
          email: nextFields["payment.email"] ?? "",
          phone: nextFields["payment.phone"] ?? "",
          phoneCountry,
          phoneCountryChosen: phoneCountryChosen.current,
        }),
      );
    } catch {
      // A blocked or full browser storage must not interrupt the checkout flow.
    }
  };
  useEffect(() => {
    let active = true;
    try {
      const saved = window.localStorage.getItem(paymentInfoKey);
      if (saved) {
        const parsed = buildDemoPaymentDraftSchema(initialPhonePrefixes).safeParse(JSON.parse(saved));
        if (parsed.success) {
          const restored = parsed.data;
          window.queueMicrotask(() => {
            if (!active) return;
            setFields((current) => ({
              ...current,
              "payment.name": restored.name,
              "payment.email": restored.email,
              "payment.phone": restored.phone,
            }));
            // Anciennes sauvegardes sans indicateur : un indicatif différent du repli historique « CI » est un vrai choix.
            const chosen = restored.phoneCountryChosen ?? restored.phoneCountry !== "CI";
            if (!chosen) return;
            phoneCountryChosen.current = true;
            setChoices((current) => ({ ...current, phoneCountry: restored.phoneCountry }));
          });
        }
      }
    } catch {
      window.localStorage.removeItem(paymentInfoKey);
    }
    // Le numéro mémorisé sur le compte prime sur le navigateur : il suit le client sur tous ses appareils.
    if (
      savedPaymentPhone &&
      initialPhonePrefixes.some((prefix) => prefix.countryCode === savedPaymentPhone.phoneCountry)
    ) {
      window.queueMicrotask(() => {
        if (!active) return;
        setFields((current) => ({ ...current, "payment.phone": savedPaymentPhone.phoneLocal }));
        phoneCountryChosen.current = true;
        setChoices((current) => ({ ...current, phoneCountry: savedPaymentPhone.phoneCountry }));
      });
    }
    return () => {
      active = false;
    };
  }, [paymentInfoKey, initialPhonePrefixes, savedPaymentPhone]);
  // Le pays détecté (ou le catalogue d'indicatifs) peut changer après le montage : tant que le client n'a pas
  // choisi lui-même un indicatif, on suit la détection.
  useEffect(() => {
    if (phoneCountryChosen.current) return;
    const detected = pickInitialPhoneCountry(initialDetectedCountry, initialPhonePrefixes);
    setChoices((current) => (current.phoneCountry === detected ? current : { ...current, phoneCountry: detected }));
  }, [initialDetectedCountry, initialPhonePrefixes]);
  useEffect(() => {
    let active = true;
    let restoredChoices: Record<string, string> | null = null;
    try {
      const savedDraft = window.localStorage.getItem(creationDraftKey);
      if (savedDraft) {
        const parsed = demoCreationChoicesSchema.safeParse(JSON.parse(savedDraft));
        if (parsed.success) restoredChoices = parsed.data;
      }
    } catch {
      window.localStorage.removeItem(creationDraftKey);
    }
    window.queueMicrotask(() => {
      if (!active) return;
      if (restoredChoices) setChoices((current) => ({ ...current, ...restoredChoices }));
      setCreationDraftReady(true);
    });
    return () => {
      active = false;
    };
  }, [creationDraftKey]);
  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(`musikpro:interface-language:${persistenceId}`);
    const available = initialInterfaceLanguages.some((language) => language.nativeName === savedLanguage);
    const detectedAvailable = initialDetectedInterfaceLanguage
      ? initialInterfaceLanguages.some((language) => language.code === initialDetectedInterfaceLanguage.code)
      : false;
    // The URL prefix (`/en/dashboard`) is authoritative and is what the server passes as the detected
    // language; the saved choice only applies when the URL gives none.
    const selected = detectedAvailable
      ? initialDetectedInterfaceLanguage!.nativeName
      : available
        ? savedLanguage!
        : (initialInterfaceLanguages[0]?.nativeName ?? "Français");
    // translate()/localizeField() (lib/i18n/translate.ts) read document.documentElement.lang live
    // during render. Mutating it right away in this effect can outrace App Router's streamed
    // hydration of sibling/child segments still mid-flight, producing a text mismatch those
    // segments never asked for (React error #418). Two rAFs push the mutation past the browser's
    // next paint, by which point the initial hydration pass has settled everywhere.
    let raf2: number | null = null;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        const selectedCode =
          initialInterfaceLanguages.find((language) => language.nativeName === selected)?.code ?? "fr";
        setChoices((current) => ({ ...current, appLanguage: selected }));
        document.documentElement.lang = selectedCode;
        // Same cookie as the public landing page: the server renders this language directly next time.
        persistLanguageCookie(selectedCode);
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2 !== null) window.cancelAnimationFrame(raf2);
    };
  }, [initialDetectedInterfaceLanguage, initialInterfaceLanguages, persistenceId]);
  // « AUTO » : la monnaie affichée vient de la détection du pays (aucun choix enregistré par le client).
  const [currencyAuto, setCurrencyAuto] = useState(false);
  useEffect(() => {
    let active = true;
    const savedCurrency = window.localStorage.getItem(`musikpro:currency:${persistenceId}`);
    const savedValid = currencies.some((currency) => currency.code === savedCurrency);
    const detectedValid = initialDetectedCurrency
      ? currencies.some((currency) => currency.code === initialDetectedCurrency)
      : false;
    const selected = savedValid
      ? (savedCurrency as CreditCurrencyCode)
      : detectedValid
        ? initialDetectedCurrency!
        : "XOF";
    window.queueMicrotask(() => {
      if (!active) return;
      setChoices((current) => ({ ...current, currency: selected }));
      setCurrencyAuto(!savedValid && detectedValid);
    });
    return () => {
      active = false;
    };
  }, [initialDetectedCurrency, persistenceId, currencies]);
  /** Revient à la monnaie détectée : oublie le choix enregistré du client. */
  const resetCurrencyToAuto = () => {
    if (!initialDetectedCurrency || !currencies.some((currency) => currency.code === initialDetectedCurrency)) return;
    window.localStorage.removeItem(`musikpro:currency:${persistenceId}`);
    setChoices((current) => ({ ...current, currency: initialDetectedCurrency }));
    setCurrencyAuto(true);
  };
  const [profile, setProfile] = useState(initialProfile);
  const [balance, setBalance] = useState(defaults.balance);
  // Keeps the displayed credits in sync with the database (payments credited by the gateway webhook,
  // generations debiting 2 credits, refunds) without a page reload. Real workspace only: the demo
  // has its own local, simulated balance.
  useEffect(() => {
    if (isDemo) return;
    let stopped = false;
    let inFlight = false;
    let lastBalance: number | undefined;
    const refresh = async () => {
      if (stopped || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const result = await apiFetch<{ balance: number }>("/api/credits/balance", { timeoutMs: 8_000, retries: 0 });
        if (!stopped && Number.isFinite(result.balance)) {
          // A higher balance means a purchase was credited: also refresh the server-rendered parts of the page
          // (e.g. the purchase history on the credits page).
          if (lastBalance !== undefined && result.balance > lastBalance) router.refresh();
          lastBalance = result.balance;
          setBalance(result.balance);
        }
      } catch {
        // Informative refresh only: keep the last known balance on any network or auth error.
      } finally {
        inFlight = false;
      }
    };
    void refresh();
    const steady = window.setInterval(refresh, 15_000);
    // Coming back from the payment page: the gateway confirmation can lag a few seconds, poll faster for a while.
    const justPaid = new URLSearchParams(window.location.search).get("payment") === "success";
    const fast = justPaid ? window.setInterval(refresh, 3_000) : undefined;
    const stopFast = justPaid ? window.setTimeout(() => fast && window.clearInterval(fast), 120_000) : undefined;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(steady);
      if (fast) window.clearInterval(fast);
      if (stopFast) window.clearTimeout(stopFast);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [isDemo, router]);
  const [songs, setSongs] = useState(() => defaults.songs);
  const [demoFavorites, setFavorites] = useState<(string | number)[]>(() => defaults.favorites);
  const [demoVersionFavorites, setVersionFavorites] = useState<string[]>(() => defaults.versionFavorites);
  // Compte réel : les favoris sont les « j'aime » par version enregistrés en base (`liked`), jamais un état local
  // qui se perdrait au rechargement. La démo garde ses favoris locaux.
  const versionFavorites = isDemo
    ? demoVersionFavorites
    : songs.flatMap((song) =>
        song.versions.flatMap((version, index) => (version.liked ? [`${song.id}|${index}`] : [])),
      );
  const favorites = isDemo
    ? demoFavorites
    : songs.filter((song) => song.versions.some((version) => version.liked)).map((song) => song.id);
  const [readNotifications, setReadNotifications] = useState<number[]>([]);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    "Génération terminée": true,
    "Nouvelles likes": true,
    "Nouvelles écoutes": false,
    "Concours & événements": true,
    "Tendances musicales": false,
    "Emails promotionnels": true,
    "Alertes de sécurité": true,
    "Sons de l'app": true,
    "Volume des notifications": true,
    "Qualité audio": true,
    "Assistant de téléchargement": true,
  });
  const [selectedSongId, setSelectedSongId] = useState<string | number>(isDemo ? 1 : "");
  const [selectedVersion, setSelectedVersion] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [packIndex, setPackIndex] = useState(-1);
  const [coupon, setCoupon] = useState<{ code: string; discountAmount: number; finalAmount: number } | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [lyricsPending, setLyricsPending] = useState(false);
  const [removedDiscoverIds, setRemovedDiscoverIds] = useState<string[]>([]);
  // Case « Partager dans Découvrir » de la création : décochée à chaque nouvelle création (rien n'est public sans ce choix).
  const [shareToDiscover, setShareToDiscover] = useState(false);
  const library = isDemo
    ? [
        ...demoLibrarySongs,
        ...demoDiscoverSongs
          .filter((s) => !demoLibrarySongs.some((l) => l.title === s.title))
          .map((s, i) => ({
            ...s,
            id: i + 50,
            duration: "3:42",
            artist: "Communauté MusikPro",
            likes: 0,
          })),
        ...demoFavoriteSongs
          .filter((s) => !demoDiscoverSongs.some((l) => l.title === s.title))
          .map((s, i) => ({
            ...s,
            id: i + 100,
            plays: String(s.plays),
            duration: "1:32",
            artist: "Création de démonstration",
            likes: 0,
          })),
      ]
    : initialDiscoverSongs
        .filter((song) => !removedDiscoverIds.includes(song.songGroupId))
        .map((song) => ({
          id: song.songGroupId as string | number,
          title: song.title,
          plays: formatPlays(song.plays),
          style: song.style ?? "",
          img: "",
          cover: song.coverUrl,
          duration: "",
          artist: "Communauté MusikPro",
          likes: 0,
          audioUrl: song.audioUrl as string | null,
          mine: song.mine,
        }));
  /** Owner-side removal from "Découvrir": the song stays in "Mes chansons", it just stops being listed. */
  const removeFromDiscover = async (songGroupId: string) => {
    try {
      await apiFetch(`/api/songs/${songGroupId}/discover`, { method: "DELETE", timeoutMs: 15_000 });
      setRemovedDiscoverIds((prev) => [...prev, songGroupId]);
      notify(t("Chanson retirée de Découvrir."));
    } catch (error) {
      notify(
        error instanceof ApiClientError ? error.message : t("Impossible de retirer cette chanson pour le moment."),
      );
    }
  };
  /** Interrupteur « Partager dans Découvrir » d'une chanson de « Mes chansons » (compte réel). */
  const setSongShared = async (songGroupId: string, shared: boolean) => {
    try {
      await apiFetch(`/api/songs/${songGroupId}/discover`, { method: shared ? "POST" : "DELETE", timeoutMs: 15_000 });
      setSongs((prev) => prev.map((song) => (song.id === songGroupId ? { ...song, sharedToDiscover: shared } : song)));
      notify(shared ? t("Chanson partagée dans Découvrir.") : t("Chanson retirée de Découvrir."));
    } catch (error) {
      notify(error instanceof ApiClientError ? error.message : t("Impossible de modifier le partage pour le moment."));
    }
  };
  const songPacks = initialCreditPlans;
  const occasions = initialOccasions;
  const moods = initialMoods;
  const musicStyles = initialMusicStyles;
  const recipientRelations = initialRecipientRelations;
  const interfaceLanguages = initialInterfaceLanguages;
  const phonePrefixes = initialPhonePrefixes;
  const lyricsLanguages = initialLyricsLanguages;
  const occasionEmoji = (name: string) => occasions.find((occasion) => occasion.name === name)?.emoji ?? "";
  const moodEmoji = (name: string) => moods.find((mood) => mood.name === name)?.emoji ?? "";
  /**
   * Displays a catalog choice (occasion/genre/plan/recipient-relation name) in the active UI
   * language, without ever changing the stored/matched value itself: demo.choices.* and the
   * generation payload always stay the canonical French name from the DB row.
   */
  const displayName = (list: { name: string; translations?: CatalogTranslations | null }[], value: string) =>
    localizeField(value, list.find((item) => item.name === value)?.translations, "name");
  const favoriteSongs = favorites.map((id) => {
    const original = isDemo ? demoFavoriteSongs.find((s) => s.id === id) : undefined;
    const own = songs.find((s) => s.id === id);
    const publicSong = library.find((s) => s.id === id);
    return {
      id,
      title: original?.title ?? own?.title ?? publicSong?.title ?? "",
      occasion: original?.occasion ?? own?.occasion ?? "Communauté",
      style: original?.style ?? own?.style ?? publicSong?.style ?? "Afrobeat",
      plays: original?.plays ?? own?.versions.reduce((n, v) => n + v.plays, 0) ?? publicSong?.plays ?? 0,
      img: original?.img ?? publicSong?.img ?? "",
    };
  });
  // Matched by id, not title: two songs (e.g. two separate "Ma chanson — Anniversaire"
  // generations) can share the exact same default title, and title-based matching used to
  // open/favorite whichever one happened to come first instead of the one actually selected.
  const owned = songs.find((s) => s.id === selectedSongId);
  const ownedVersion = owned?.versions[selectedVersion];
  const currentSong = selectedSongId
    ? owned
      ? {
          id: owned.id,
          title: owned.title,
          style: owned.style,
          img: "",
          cover: owned.coverUrl ?? null,
          duration: ownedVersion?.duration ?? "1m 32s",
          artist: profile.name,
          likes: isDemo ? (ownedVersion?.plays ?? 0) : owned.versions.filter((version) => version.liked).length,
          audioUrl: ownedVersion?.audioUrl ?? null,
          status: ownedVersion?.status ?? "completed",
        }
      : {
          audioUrl: null as string | null,
          cover: null as string | null,
          status: "completed" as const,
          ...(library.find((s) => s.id === selectedSongId) ?? {
            id: selectedSongId,
            title: "Chanson",
            style: isDemo ? "Création de démonstration" : "Création MusikPro",
            img: "",
            duration: "1:32",
            artist: profile.name,
            likes: 0,
          }),
        }
    : null;
  const go = (route: string) => {
    notify("");
    router.push(href(route));
  };
  /**
   * "Régénérer" doit renvoyer directement à la dernière étape de l'assistant (résumé "Prêt à
   * générer") avec les préférences de LA chanson concernée déjà en place, plutôt qu'à l'étape 1
   * avec un assistant vide. `song.occasion`/`song.style` sont déjà les valeurs canoniques
   * stockées (mêmes chaînes que celles utilisées par les catalogues occasions/styles), donc
   * elles se branchent directement sur `choices.occasion`/`choices.genre`. Voix/langue/humeur ne
   * sont pas conservées sur une chanson générée : elles restent à leur valeur actuelle.
   */
  const startRegenerate = (song: { occasion: string; style: string; lyrics: string }) => {
    choose("occasion", song.occasion);
    choose("genre", song.style);
    field("lyrics", song.lyrics);
    go("/dashboard/create/confirm");
  };
  const exitAccount = async () => {
    notify("");
    if (!isDemo) await authClient.signOut();
    router.replace("/login");
    router.refresh();
  };
  const field = (key: string, value: string) => {
    setFields((prev) => {
      const next = { ...prev, [key]: value };
      if (key.startsWith("payment.")) persistPaymentInfo(next, choices.phoneCountry);
      return next;
    });
  };
  const choose = (key: string, value: string) => {
    if (key === "occasion" && value !== choices.occasion) setDetails({});
    const nextChoices = { ...choices, [key]: value };
    setChoices(nextChoices);
    if (key === "appLanguage") {
      window.localStorage.setItem(`musikpro:interface-language:${persistenceId}`, value);
      const code = initialInterfaceLanguages.find((language) => language.nativeName === value)?.code ?? "fr";
      document.documentElement.lang = code;
      persistLanguageCookie(code);
      // Keep the URL in step with the language (/fr/dashboard → /en/dashboard) without reloading:
      // same page, same client state, instant switch. Links built by href() follow via localeCode.
      setLocaleCode(code);
      window.history.replaceState(
        window.history.state,
        "",
        withLocalePrefix(window.location.pathname, code) + window.location.search + window.location.hash,
      );
    }
    if (key === "currency") {
      window.localStorage.setItem(`musikpro:currency:${persistenceId}`, value);
      setCurrencyAuto(false);
    }
    if (key === "phoneCountry") {
      phoneCountryChosen.current = true;
      persistPaymentInfo(fields, value);
    }
    if (!creationDraftReady || !["occasion", "genre", "mood", "language", "voice", "recipientRelation"].includes(key)) {
      return;
    }
    const draft = demoCreationChoicesSchema.safeParse(nextChoices);
    if (!draft.success) return;
    try {
      window.localStorage.setItem(creationDraftKey, JSON.stringify(draft.data));
    } catch {
      // A blocked or full browser storage must not interrupt song creation.
    }
  };
  /**
   * Reprise d'un brouillon de création (écran « Reprendre ou recommencer ») : applique d'un seul coup les choix, les
   * champs et les détails d'occasion. Ne passe volontairement pas par `choose()` : appelé plusieurs fois de suite,
   * celui-ci repart à chaque fois de l'état précédent et écraserait les valeurs déjà appliquées.
   */
  const restoreCreationDraft = (draft: CreationDraftData) => {
    setChoices((prev) => ({ ...prev, ...draft.choices }));
    setFields((prev) => ({ ...prev, ...draft.fields }));
    setDetails(draft.details);
    setPackIndex(draft.packIndex);
    try {
      window.localStorage.setItem(creationDraftKey, JSON.stringify(draft.choices));
    } catch {
      // A blocked or full browser storage must not interrupt song creation.
    }
  };
  /** « Recommencer de zéro » : vide le parcours de création (état en mémoire + repli local), sans toucher au reste. */
  const resetCreationDraft = () => {
    setChoices((prev) => ({
      ...prev,
      occasion: "",
      genre: "",
      mood: "",
      language: "",
      voice: "",
      recipientRelation: "",
    }));
    setFields((prev) => ({
      ...prev,
      story: "",
      recipientName: "",
      recipientPronunciation: "",
      senderName: "",
      senderPronunciation: "",
      lyrics: "",
      detail: "",
    }));
    setDetails({});
    setPackIndex(-1);
    try {
      window.localStorage.removeItem(creationDraftKey);
    } catch {
      // Nothing to clean when storage is unavailable.
    }
  };
  const toggle = (key: string) => setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  /**
   * Enregistre le « j'aime » d'une version (compte réel) : mise à jour immédiate, puis annulée avec un message si
   * l'enregistrement échoue.
   */
  const persistVersionLiked = (songId: string | number, index: number, nextLiked: boolean) => {
    const song = songs.find((s) => s.id === songId);
    const jobId = song?.versions[index]?.jobId;
    if (!song || !jobId) return;
    const apply = (liked: boolean) =>
      setSongs((prev) =>
        prev.map((s) =>
          s.id !== song.id ? s : { ...s, versions: s.versions.map((v, i) => (i === index ? { ...v, liked } : v)) },
        ),
      );
    apply(nextLiked);
    void apiFetch(`/api/songs/${song.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-like", jobId, liked: nextLiked }),
    }).catch(() => {
      apply(!nextLiked);
      notify(t("Impossible d’enregistrer ce favori pour le moment."));
    });
  };
  /**
   * Cœur d'une chanson entière (lecteur, page Favoris). Compte réel : une chanson est favorite dès qu'une de ses
   * versions l'est ; on retire donc tous les favoris de la chanson, ou on ajoute la version en cours d'écoute.
   */
  const toggleFavorite = (id: string | number) => {
    if (isDemo) {
      setFavorites((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
      return;
    }
    const song = songs.find((s) => s.id === id);
    if (!song) {
      notify(t("Seules tes propres chansons peuvent être ajoutées aux favoris."));
      return;
    }
    const likedIndexes = song.versions.flatMap((version, index) => (version.liked ? [index] : []));
    if (likedIndexes.length) {
      likedIndexes.forEach((index) => persistVersionLiked(song.id, index, false));
      return;
    }
    const index = selectedSongId === song.id && song.versions[selectedVersion] ? selectedVersion : 0;
    persistVersionLiked(song.id, index, true);
  };
  // Keyed by the song's unique id, not its title: several songs (e.g. two separate
  // "Ma chanson — Anniversaire" generations) can share the exact same title, and a
  // title-based key made liking/playing one collide visually with every same-titled song's
  // version at the same index.
  const toggleVersion = (songId: string | number, index: number) => {
    if (!isDemo) {
      const version = songs.find((s) => s.id === songId)?.versions[index];
      if (version?.jobId) persistVersionLiked(songId, index, !version.liked);
      return;
    }
    const key = `${songId}|${index}`;
    const next = versionFavorites.includes(key)
      ? versionFavorites.filter((v) => v !== key)
      : [...versionFavorites, key];
    setVersionFavorites(next);
    setFavorites((prev) =>
      next.some((v) => v.startsWith(`${songId}|`))
        ? prev.includes(songId)
          ? prev
          : [...prev, songId]
        : prev.filter((v) => v !== songId),
    );
  };
  const registerPlay = (songId: string | number, index: number) => {
    if (isDemo) return;
    const song = songs.find((s) => s.id === songId);
    const jobId = song?.versions[index]?.jobId;
    if (!jobId) return;
    setSongs((prev) =>
      prev.map((s) =>
        s.id !== songId
          ? s
          : { ...s, versions: s.versions.map((v, i) => (i === index ? { ...v, plays: v.plays + 1 } : v)) },
      ),
    );
    void apiFetch(`/api/songs/${songId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "increment-play", jobId }),
    }).catch(() => {
      // A missed play-count tick is not worth surfacing to the listener.
    });
  };
  const openSong = (id: string | number, version = 0) => {
    setSelectedSongId(id);
    setSelectedVersion(version);
    go("/dashboard/songs/player");
  };
  const nextSong = (direction: number) => {
    if (!library.length) return;
    const index = library.findIndex((s) => s.id === selectedSongId);
    setSelectedSongId(library[(index + direction + library.length) % library.length].id);
    // Passer à une autre chanson doit la lancer (et repartir de sa première version).
    setSelectedVersion(0);
    setPlaying(true);
  };
  /** Joue directement une chanson choisie dans la file « Suivant » du lecteur (sans changer de page). */
  const selectSong = (id: string | number) => {
    setSelectedSongId(id);
    setSelectedVersion(0);
    setPlaying(true);
  };
  const refreshSongs = async () => {
    if (isDemo) return;
    // A failed background refresh must not disrupt the current screen, but it must not leave the library
    // stale either (a generating song would stay invisible): retry a couple of times before giving up.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await apiFetch<{ songs: SongGroupResponse[] }>("/api/songs", { timeoutMs: 45_000 });
        setSongs(result.songs.map(mapSongGroup));
        return;
      } catch {
        await new Promise((resolve) => window.setTimeout(resolve, 3_000));
      }
    }
  };
  /**
   * Drops one freshly polled song straight into the library so the generation screen can leave the
   * instant its MP3 is delivered, instead of first waiting on a full-list refresh (which itself
   * re-polls Musicful for every pending job and can take many seconds).
   */
  const applySongGroup = (group: SongGroupResponse) => {
    if (isDemo) return;
    const mapped = mapSongGroup(group);
    setSongs((prev) =>
      prev.some((s) => s.id === mapped.id) ? prev.map((s) => (s.id === mapped.id ? mapped : s)) : [mapped, ...prev],
    );
  };
  // A generation takes a few minutes: while any song still has a version "processing", keep it fresh from
  // here (one poller for every screen: player, "Mes chansons", home...) so a finished song shows up by
  // itself, without reloading the page. Only the pending song(s) are fetched (light /api/songs/[groupId]),
  // never the whole library. Requests never overlap (the next one is scheduled after the previous ended)
  // and the loop pauses while the tab is hidden.
  const processingIds = songs
    .filter((song) => song.status === "processing" || song.versions.some((version) => version.status === "processing"))
    .map((song) => String(song.id));
  const processingKey = processingIds.join("|");
  const applySongGroupRef = useRef(applySongGroup);
  useEffect(() => {
    applySongGroupRef.current = applySongGroup;
  });
  useEffect(() => {
    if (isDemo || !processingKey) return;
    const ids = processingKey.split("|");
    let stopped = false;
    let timer: number | undefined;
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState !== "hidden") {
        await Promise.all(
          ids.map(async (id) => {
            try {
              const result = await apiFetch<{ song: SongGroupResponse }>(`/api/songs/${encodeURIComponent(id)}`, {
                timeoutMs: 25_000,
                retries: 0,
              });
              if (!stopped) applySongGroupRef.current(result.song);
            } catch {
              // Background refresh only: try again on the next tick.
            }
          }),
        );
      }
      if (!stopped) timer = window.setTimeout(tick, 4_000);
    };
    timer = window.setTimeout(tick, 4_000);
    const onVisible = () => {
      if (document.visibilityState !== "visible" || stopped) return;
      window.clearTimeout(timer);
      void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isDemo, processingKey]);
  useEffect(() => {
    // Real songs otherwise only ever load once a page happens to fetch them itself (e.g. the
    // full "Mes chansons" screen) — every other dashboard page (home, player, ...) reads
    // `songs` from this same provider, so it must be populated once here on mount too, or it
    // stays permanently empty for them.
    window.queueMicrotask(() => void refreshSongs());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);
  /** Demo-only instant fake generation, unchanged from the original scaffold. */
  const generateSong = async () => {
    const title = buildSongTitle({
      recipientName: fields.recipientName,
      occasion: choices.occasion,
      genre: choices.genre,
    });
    const existingId = songs.find((s) => s.title === title)?.id;
    const newId = existingId ?? songs.length + 1000;
    setSongs((prev) =>
      existingId !== undefined
        ? prev
        : [
            {
              id: newId,
              title,
              occasion: choices.occasion,
              style: choices.genre,
              date: "Session de démonstration",
              lyrics: fields.lyrics,
              versions: [
                { label: "Version 1", duration: "1m 32s", plays: 0, liked: false },
                { label: "Version 2", duration: "1m 45s", plays: 0, liked: false },
              ],
            },
            ...prev,
          ],
    );
    setSelectedSongId(newId);
    go("/dashboard/songs");
  };
  /**
   * Real submission only — no navigation. The caller (StepGeneratingSong) owns waiting for
   * the versions to actually finish before leaving the animation screen.
   */
  const startRealGeneration = async (): Promise<{ songGroupId: string } | null> => {
    if (!paymentBypassEnabled && balance < CREDITS_PER_GENERATION) {
      router.push(href("/dashboard/credits"));
      notify(
        translateTemplate("Il faut {credits} crédits pour lancer une génération musicale.", {
          credits: CREDITS_PER_GENERATION,
        }),
      );
      return null;
    }
    try {
      const result = await apiFetch<{ songGroupId: string; newBalance: number }>("/api/songs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion: choices.occasion,
          genre: choices.genre,
          recipientName: fields.recipientName,
          mood: choices.mood,
          voice: choices.voice,
          language: choices.language,
          lyrics: fields.lyrics,
          occasionDetails: buildOccasionDetails(occasionFields, details),
          shareToDiscover,
        }),
        timeoutMs: 30_000,
      });
      setBalance(result.newBalance);
      setSelectedSongId(result.songGroupId);
      setShareToDiscover(false);
      return { songGroupId: result.songGroupId };
    } catch (error) {
      notify(
        error instanceof ApiClientError
          ? error.message
          : t("La génération n’a pas pu démarrer. Réessaie dans un instant."),
      );
      go("/dashboard/songs");
      return null;
    }
  };
  const generateLyrics = async (
    task: "lyrics.generate" | "lyrics.extend" | "lyrics.rewrite" = "lyrics.generate",
    instruction = "",
  ) => {
    if (isDemo) {
      field("lyrics", task === "lyrics.extend" ? `${fields.lyrics}\n\n${demoLyrics}` : demoLyrics);
      if (task === "lyrics.rewrite") notify(t("Les paroles de démonstration ont été révisées."), { demoOnly: true });
      go("/dashboard/create/lyrics");
      return true;
    }
    if (lyricsPending) return false;
    setLyricsPending(true);
    try {
      const result = await apiFetch<{ lyrics: string }>("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          input: {
            occasion: choices.occasion,
            story: fields.story,
            recipientName: fields.recipientName,
            recipientRelation: choices.recipientRelation,
            recipientPronunciation: fields.recipientPronunciation,
            senderName: fields.senderName,
            senderPronunciation: fields.senderPronunciation,
            genre: choices.genre,
            mood: choices.mood,
            language: choices.language,
            voice: choices.voice,
            additionalDetails: fields.detail,
            occasionDetails: buildOccasionDetails(occasionFields, details),
            ...(task === "lyrics.extend" ? { lyrics: fields.lyrics } : {}),
            ...(task === "lyrics.rewrite" ? { lyrics: fields.lyrics, instruction } : {}),
          },
        }),
        timeoutMs: 115_000,
      });
      field("lyrics", result.lyrics);
      go("/dashboard/create/lyrics");
      return true;
    } catch (error) {
      notify(
        error instanceof DOMException && error.name === "AbortError"
          ? t("La génération prend plus de temps que prévu. Réessaie dans un instant.")
          : error instanceof Error
            ? error.message
            : t("La génération des paroles a échoué."),
      );
      go(task === "lyrics.generate" ? "/dashboard/create/parameters" : "/dashboard/create/lyrics");
      return false;
    } finally {
      setLyricsPending(false);
    }
  };
  return {
    isDemo,
    paymentBypassEnabled,
    versionsPerGeneration,
    generationRedirectDelaySeconds,
    generationPollIntervalMs,
    storeLinks,
    currencies,
    balance,
    pathname,
    href,
    message,
    notify,
    fields,
    field,
    choices,
    choose,
    restoreCreationDraft,
    resetCreationDraft,
    profile,
    setProfile,
    songs,
    library,
    songPacks,
    occasions,
    moods,
    musicStyles,
    recipientRelations,
    currentOccasion,
    occasionFields,
    details,
    setDetail,
    occasionBlocks,
    removeFromDiscover,
    currencyAuto,
    resetCurrencyToAuto,
    detectedCountry: initialDetectedCountry,
    detectedCurrency: initialDetectedCurrency,
    setSongShared,
    shareToDiscover,
    setShareToDiscover,
    interfaceLanguages,
    lyricsLanguages,
    phonePrefixes,
    occasionEmoji,
    moodEmoji,
    displayName,
    favorites,
    favoriteSongs,
    versionFavorites,
    toggleFavorite,
    toggleVersion,
    registerPlay,
    readNotifications,
    setReadNotifications,
    toggles,
    toggle,
    selectedSongId,
    selectedVersion,
    currentSong,
    openSong,
    nextSong,
    selectSong,
    playing,
    setPlaying,
    packIndex,
    setPackIndex,
    coupon,
    setCoupon,
    pack: songPacks[packIndex] ?? null,
    paymentConfirmed,
    setPaymentConfirmed,
    generateSong,
    startRealGeneration,
    generateLyrics,
    lyricsPending,
    refreshSongs,
    applySongGroup,
    removeSong: async (id: string | number) => {
      const song = songs.find((s) => s.id === id);
      if (!song) return;
      if (isDemo) {
        setSongs((prev) => prev.filter((s) => s.id !== id));
        setFavorites((prev) => prev.filter((v) => v !== song.id));
        setVersionFavorites((prev) => prev.filter((v) => !v.startsWith(`${song.id}|`)));
        notify(t("Chanson retirée de cette démonstration locale."), { demoOnly: true });
        return;
      }
      try {
        await apiFetch(`/api/songs/${id}`, { method: "DELETE" });
        await refreshSongs();
        notify(t("Chanson retirée."));
      } catch (error) {
        // A song the owner has placed somewhere (landing sections, Tendances, ambient music) is
        // protected server-side; its message names where it is used.
        notify(
          error instanceof ApiClientError && error.code === "SONG_IN_USE"
            ? error.message
            : t("Impossible de retirer cette chanson pour le moment."),
        );
      }
    },
    publishSong: async (id: string | number, jobId?: string): Promise<string | null> => {
      if (isDemo) {
        notify(t("Action de démonstration : aucune opération réelle effectuée."), { demoOnly: true });
        return null;
      }
      try {
        const result = await apiFetch<{ url: string }>(`/api/songs/${id}/publish`, {
          method: "POST",
          ...(jobId ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) } : {}),
        });
        return result.url;
      } catch (error) {
        notify(
          error instanceof ApiClientError ? error.message : t("Impossible de publier cette chanson pour le moment."),
        );
        return null;
      }
    },
    setSongCover: async (id: string | number, coverUrl: string): Promise<boolean> => {
      if (isDemo) {
        notify(t("Action de démonstration : aucune opération réelle effectuée."), { demoOnly: true });
        return false;
      }
      try {
        await apiFetch(`/api/songs/${id}/cover`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coverUrl }),
        });
        await refreshSongs();
        notify(t("Pochette mise à jour."));
        return true;
      } catch {
        notify(t("Impossible de mettre à jour la pochette pour le moment."));
        return false;
      }
    },
    go,
    startRegenerate,
    exitAccount,
  };
}

type DemoState = ReturnType<typeof useDemoState>;
const Context = createContext<DemoState | null>(null);
export function DemoProvider({
  children,
  mode,
  initialProfile,
  initialBalance = 0,
  initialCreditPlans,
  initialOccasions,
  initialMoods,
  initialMusicStyles,
  initialRecipientRelations,
  initialOccasionFields = {},
  initialDiscoverSongs,
  initialInterfaceLanguages,
  initialLyricsLanguages,
  initialDetectedInterfaceLanguage,
  persistenceId,
  paymentBypassEnabled = false,
  versionsPerGeneration = 1,
  generationRedirectDelaySeconds = 180,
  generationPollIntervalMs = 5_000,
  initialPhonePrefixes,
  initialDetectedCurrency,
  initialDetectedCountry = null,
  initialCurrencies = DEFAULT_CURRENCIES,
  initialSavedPaymentPhone = null,
  storeLinks = { googlePlayUrl: null, appStoreUrl: null, hideInApp: true },
}: {
  children: ReactNode;
  mode: "demo" | "real";
  initialProfile: DemoProfile;
  initialBalance?: number;
  initialCreditPlans: CreditPlanOption[];
  initialOccasions: OccasionOption[];
  initialMoods: MoodOption[];
  initialMusicStyles: MusicStyleOption[];
  initialRecipientRelations: RecipientRelationOption[];
  initialOccasionFields?: Record<string, OccasionFieldClientDefinition[]>;
  initialDiscoverSongs: DiscoverSong[];
  initialInterfaceLanguages: LanguageOption[];
  initialLyricsLanguages: LanguageOption[];
  initialDetectedInterfaceLanguage: LanguageOption | null;
  persistenceId: string;
  paymentBypassEnabled?: boolean;
  versionsPerGeneration?: number;
  generationRedirectDelaySeconds?: number;
  generationPollIntervalMs?: number;
  initialPhonePrefixes: PhonePrefixOption[];
  initialDetectedCurrency: CreditCurrencyCode | null;
  initialDetectedCountry?: string | null;
  initialCurrencies?: CreditCurrency[];
  /** Numéro mémorisé côté serveur après un premier paiement : prérempli sur tous les appareils du compte. */
  initialSavedPaymentPhone?: { phoneLocal: string; phoneCountry: string } | null;
  storeLinks?: StoreLinks;
}) {
  const state = useDemoState(
    mode,
    initialProfile,
    initialBalance,
    initialCreditPlans,
    initialOccasions,
    initialMoods,
    initialMusicStyles,
    initialRecipientRelations,
    initialOccasionFields,
    initialDiscoverSongs,
    initialInterfaceLanguages,
    initialLyricsLanguages,
    initialDetectedInterfaceLanguage,
    persistenceId,
    paymentBypassEnabled,
    versionsPerGeneration,
    initialPhonePrefixes,
    initialDetectedCurrency,
    initialCurrencies,
    initialDetectedCountry,
    storeLinks,
    generationRedirectDelaySeconds,
    generationPollIntervalMs,
    initialSavedPaymentPhone,
  );
  useI18nOverlay();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <Context.Provider value={state}>
      {offline && (
        <InlineNotice tone="warning" className="demo-offline">
          {state.isDemo
            ? t("Hors ligne — les données de cette démonstration restent locales.")
            : t("Hors ligne — certaines données peuvent être indisponibles.")}
        </InlineNotice>
      )}
      {children}
      {state.message && (
        <div className="demo-notice">
          <InlineNotice tone="info" onDismiss={() => state.notify("")} closeLabel={t("Fermer la notification")}>
            {state.message}
          </InlineNotice>
        </div>
      )}
    </Context.Provider>
  );
}
export function useDemo() {
  const state = useContext(Context);
  if (!state) throw new Error("DemoProvider requis");
  return state;
}
