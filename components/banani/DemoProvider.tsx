"use client";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { demoLibrarySongs, demoDiscoverSongs, demoFavoriteSongs, demoLyrics } from "@/lib/demo/musikpro-data";
import { InlineNotice } from "@/components/ui/inline-notice";
import { authClient } from "@/lib/auth/client";
import { dashboardHref, normalizeDashboardPath } from "@/lib/demo/routing";
import { getWorkspaceDefaults } from "@/lib/demo/workspace-defaults";
import { demoCreationChoicesSchema, buildDemoPaymentDraftSchema } from "@/lib/validation/musikpro-demo";
import { CREDITS_PER_GENERATION, type CreditPlanOption } from "@/lib/credit-plans/catalog";
import type { OccasionOption } from "@/lib/occasions/catalog";
import type { MusicStyleOption } from "@/lib/music-styles/catalog";
import type { RecipientRelationOption } from "@/lib/recipient-relations/catalog";
import type { LibraryCollectionOption } from "@/lib/library-collections/catalog";
import type { LanguageOption } from "@/lib/languages/catalog";
import type { PhonePrefixOption } from "@/lib/phone-prefixes/catalog";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { localizeField, type CatalogTranslations } from "@/lib/i18n/translate";
import type { WorkspaceSong } from "@/lib/demo/song-types";

type SongGroupResponse = {
  songGroupId: string;
  title: string;
  occasion: string | null;
  style: string | null;
  lyrics: string | null;
  status: "processing" | "completed" | "failed";
  createdAt: string;
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
    lyrics: song.lyrics || "",
    status: song.status,
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

function useDemoState(
  mode: "demo" | "real",
  initialProfile: DemoProfile,
  initialBalance: number,
  initialCreditPlans: CreditPlanOption[],
  initialOccasions: OccasionOption[],
  initialMusicStyles: MusicStyleOption[],
  initialRecipientRelations: RecipientRelationOption[],
  initialLibraryCollections: LibraryCollectionOption[],
  initialInterfaceLanguages: LanguageOption[],
  initialLyricsLanguages: LanguageOption[],
  initialDetectedInterfaceLanguage: LanguageOption | null,
  persistenceId: string,
  paymentBypassEnabled: boolean,
  versionsPerGeneration: number,
  initialPhonePrefixes: PhonePrefixOption[],
) {
  const router = useRouter();
  const browserPathname = usePathname();
  const isDemo = mode === "demo";
  const defaults = getWorkspaceDefaults(isDemo, initialBalance);
  const pathname = normalizeDashboardPath(browserPathname);
  const href = (route: string) => dashboardHref(route, isDemo);
  const [message, setMessage] = useState("");
  const notify = (nextMessage: string) =>
    setMessage(
      !isDemo && /démonstration/i.test(nextMessage)
        ? "Cette fonctionnalité sera bientôt disponible dans votre espace MusikPro."
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
    "payment.name": "",
    "payment.email": "",
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
    phoneCountry: "CI",
    recipientRelation: "",
  });
  const [creationDraftReady, setCreationDraftReady] = useState(false);
  const creationDraftKey = `musikpro:creation-draft:v1:${persistenceId}`;
  const paymentInfoKey = `musikpro:payment-info:v1:${persistenceId}`;
  const persistPaymentInfo = (nextFields: Record<string, string>, phoneCountry: string) => {
    try {
      window.localStorage.setItem(
        paymentInfoKey,
        JSON.stringify({
          name: nextFields["payment.name"] ?? "",
          email: nextFields["payment.email"] ?? "",
          phone: nextFields["payment.phone"] ?? "",
          phoneCountry,
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
            setChoices((current) => ({ ...current, phoneCountry: restored.phoneCountry }));
          });
        }
      }
    } catch {
      window.localStorage.removeItem(paymentInfoKey);
    }
    return () => {
      active = false;
    };
  }, [paymentInfoKey, initialPhonePrefixes]);
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
    const selected = available
      ? savedLanguage!
      : detectedAvailable
        ? initialDetectedInterfaceLanguage!.nativeName
        : (initialInterfaceLanguages[0]?.nativeName ?? "Français");
    // translate()/localizeField() (lib/i18n/translate.ts) read document.documentElement.lang live
    // during render. Mutating it right away in this effect can outrace App Router's streamed
    // hydration of sibling/child segments still mid-flight, producing a text mismatch those
    // segments never asked for (React error #418). Two rAFs push the mutation past the browser's
    // next paint, by which point the initial hydration pass has settled everywhere.
    let raf2: number | null = null;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setChoices((current) => ({ ...current, appLanguage: selected }));
        document.documentElement.lang =
          initialInterfaceLanguages.find((language) => language.nativeName === selected)?.code ?? "fr";
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2 !== null) window.cancelAnimationFrame(raf2);
    };
  }, [initialDetectedInterfaceLanguage, initialInterfaceLanguages, persistenceId]);
  const [profile, setProfile] = useState(initialProfile);
  const [balance, setBalance] = useState(defaults.balance);
  const [songs, setSongs] = useState(() => defaults.songs);
  const [favorites, setFavorites] = useState<string[]>(() => defaults.favorites);
  const [versionFavorites, setVersionFavorites] = useState<string[]>(() => defaults.versionFavorites);
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
  const [selectedTitle, setSelectedTitle] = useState(isDemo ? "Mama Africa" : "");
  const [selectedVersion, setSelectedVersion] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [packIndex, setPackIndex] = useState(-1);
  const [coupon, setCoupon] = useState<{ code: string; discountAmount: number; finalAmount: number } | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [lyricsPending, setLyricsPending] = useState(false);
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
    : [];
  const songPacks = initialCreditPlans;
  const occasions = initialOccasions;
  const musicStyles = initialMusicStyles;
  const recipientRelations = initialRecipientRelations;
  const libraryCollections = initialLibraryCollections;
  const interfaceLanguages = initialInterfaceLanguages;
  const phonePrefixes = initialPhonePrefixes;
  const lyricsLanguages = initialLyricsLanguages;
  const occasionEmoji = (name: string) => occasions.find((occasion) => occasion.name === name)?.emoji ?? "";
  /**
   * Displays a catalog choice (occasion/genre/plan/recipient-relation name) in the active UI
   * language, without ever changing the stored/matched value itself: demo.choices.* and the
   * generation payload always stay the canonical French name from the DB row.
   */
  const displayName = (list: { name: string; translations?: CatalogTranslations | null }[], value: string) =>
    localizeField(value, list.find((item) => item.name === value)?.translations, "name");
  const favoriteSongs = favorites.map((title, i) => {
    const original = isDemo ? demoFavoriteSongs.find((s) => s.title === title) : undefined;
    const own = songs.find((s) => s.title === title);
    const publicSong = library.find((s) => s.title === title);
    return {
      id: i,
      title,
      occasion: original?.occasion ?? own?.occasion ?? "Communauté",
      style: original?.style ?? own?.style ?? publicSong?.style ?? "Afrobeat",
      plays: original?.plays ?? own?.versions.reduce((n, v) => n + v.plays, 0) ?? publicSong?.plays ?? 0,
      img: original?.img ?? publicSong?.img ?? "",
    };
  });
  const owned = songs.find((s) => s.title === selectedTitle);
  const ownedVersion = owned?.versions[selectedVersion];
  const currentSong = selectedTitle
    ? owned
      ? {
          id: owned.id,
          title: owned.title,
          style: owned.style,
          img: "",
          duration: ownedVersion?.duration ?? "1m 32s",
          artist: profile.name,
          likes: ownedVersion?.plays ?? 0,
          audioUrl: ownedVersion?.audioUrl ?? null,
          status: ownedVersion?.status ?? "completed",
        }
      : {
          audioUrl: null as string | null,
          status: "completed" as const,
          ...(library.find((s) => s.title === selectedTitle) ?? {
            id: -1,
            title: selectedTitle,
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
    const nextChoices = { ...choices, [key]: value };
    setChoices(nextChoices);
    if (key === "appLanguage") {
      window.localStorage.setItem(`musikpro:interface-language:${persistenceId}`, value);
      document.documentElement.lang =
        initialInterfaceLanguages.find((language) => language.nativeName === value)?.code ?? "fr";
    }
    if (key === "phoneCountry") persistPaymentInfo(fields, value);
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
  const toggle = (key: string) => setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleFavorite = (title: string) =>
    setFavorites((prev) => (prev.includes(title) ? prev.filter((v) => v !== title) : [...prev, title]));
  // Keyed by the song's unique id, not its title: several songs (e.g. two separate
  // "Ma chanson — Anniversaire" generations) can share the exact same title, and a
  // title-based key made liking/playing one collide visually with every same-titled song's
  // version at the same index.
  const toggleVersion = (songId: string | number, index: number) => {
    if (!isDemo) {
      const song = songs.find((s) => s.id === songId);
      const version = song?.versions[index];
      if (!song || !version?.jobId) return;
      const nextLiked = !version.liked;
      const jobId = version.jobId;
      setSongs((prev) =>
        prev.map((s) =>
          s.id !== song.id
            ? s
            : { ...s, versions: s.versions.map((v, i) => (i === index ? { ...v, liked: nextLiked } : v)) },
        ),
      );
      void apiFetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-like", jobId, liked: nextLiked }),
      }).catch(() => {
        setSongs((prev) =>
          prev.map((s) =>
            s.id !== song.id
              ? s
              : { ...s, versions: s.versions.map((v, i) => (i === index ? { ...v, liked: !nextLiked } : v)) },
          ),
        );
        notify("Impossible d’enregistrer ce favori pour le moment.");
      });
      return;
    }
    const key = `${songId}|${index}`;
    const next = versionFavorites.includes(key)
      ? versionFavorites.filter((v) => v !== key)
      : [...versionFavorites, key];
    setVersionFavorites(next);
    const title = songs.find((s) => s.id === songId)?.title;
    if (!title) return;
    setFavorites((prev) =>
      next.some((v) => v.startsWith(`${songId}|`))
        ? prev.includes(title)
          ? prev
          : [...prev, title]
        : prev.filter((v) => v !== title),
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
  const openSong = (title: string, version = 0) => {
    setSelectedTitle(title);
    setSelectedVersion(version);
    go("/dashboard/songs/player");
  };
  const nextSong = (direction: number) => {
    if (!library.length) return;
    const index = library.findIndex((s) => s.title === selectedTitle);
    setSelectedTitle(library[(index + direction + library.length) % library.length].title);
  };
  const refreshSongs = async () => {
    if (isDemo) return;
    try {
      const result = await apiFetch<{ songs: SongGroupResponse[] }>("/api/songs", { timeoutMs: 20_000 });
      setSongs(result.songs.map(mapSongGroup));
    } catch {
      // A failed background refresh must not disrupt the current screen.
    }
  };
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
    const title = `Ma chanson — ${choices.occasion}`;
    setSongs((prev) =>
      prev.some((s) => s.title === title)
        ? prev
        : [
            {
              id: prev.length + 1000,
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
    setSelectedTitle(title);
    go("/dashboard/songs");
  };
  /**
   * Real submission only — no navigation. The caller (StepGeneratingSong) owns waiting for
   * the versions to actually finish before leaving the animation screen.
   */
  const startRealGeneration = async (): Promise<{ songGroupId: string } | null> => {
    if (!paymentBypassEnabled && balance < CREDITS_PER_GENERATION) {
      router.push(href("/dashboard/credits"));
      notify(`Il faut ${CREDITS_PER_GENERATION} crédits pour lancer une génération musicale.`);
      return null;
    }
    try {
      const result = await apiFetch<{ songGroupId: string; newBalance: number }>("/api/songs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion: choices.occasion,
          genre: choices.genre,
          mood: choices.mood,
          voice: choices.voice,
          lyrics: fields.lyrics,
        }),
        timeoutMs: 30_000,
      });
      setBalance(result.newBalance);
      setSelectedTitle(`Ma chanson — ${choices.occasion}`);
      return { songGroupId: result.songGroupId };
    } catch (error) {
      notify(
        error instanceof ApiClientError
          ? error.message
          : "La génération n’a pas pu démarrer. Réessaie dans un instant.",
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
      if (task === "lyrics.rewrite") notify("Les paroles de démonstration ont été révisées.");
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
            genre: choices.genre,
            mood: choices.mood,
            language: choices.language,
            voice: choices.voice,
            additionalDetails: fields.detail,
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
          ? "La génération prend plus de temps que prévu. Réessaie dans un instant."
          : error instanceof Error
            ? error.message
            : "La génération des paroles a échoué.",
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
    balance,
    pathname,
    href,
    message,
    notify,
    fields,
    field,
    choices,
    choose,
    profile,
    setProfile,
    songs,
    library,
    songPacks,
    occasions,
    musicStyles,
    recipientRelations,
    libraryCollections,
    interfaceLanguages,
    lyricsLanguages,
    phonePrefixes,
    occasionEmoji,
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
    selectedTitle,
    selectedVersion,
    currentSong,
    openSong,
    nextSong,
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
    removeSong: async (id: string | number) => {
      const song = songs.find((s) => s.id === id);
      if (!song) return;
      if (isDemo) {
        setSongs((prev) => prev.filter((s) => s.id !== id));
        setFavorites((prev) => prev.filter((v) => v !== song.title));
        setVersionFavorites((prev) => prev.filter((v) => !v.startsWith(`${song.id}|`)));
        notify("Chanson retirée de cette démonstration locale.");
        return;
      }
      try {
        await apiFetch(`/api/songs/${id}`, { method: "DELETE" });
        await refreshSongs();
        notify("Chanson retirée.");
      } catch {
        notify("Impossible de retirer cette chanson pour le moment.");
      }
    },
    go,
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
  initialMusicStyles,
  initialRecipientRelations,
  initialLibraryCollections,
  initialInterfaceLanguages,
  initialLyricsLanguages,
  initialDetectedInterfaceLanguage,
  persistenceId,
  paymentBypassEnabled = false,
  versionsPerGeneration = 1,
  initialPhonePrefixes,
}: {
  children: ReactNode;
  mode: "demo" | "real";
  initialProfile: DemoProfile;
  initialBalance?: number;
  initialCreditPlans: CreditPlanOption[];
  initialOccasions: OccasionOption[];
  initialMusicStyles: MusicStyleOption[];
  initialRecipientRelations: RecipientRelationOption[];
  initialLibraryCollections: LibraryCollectionOption[];
  initialInterfaceLanguages: LanguageOption[];
  initialLyricsLanguages: LanguageOption[];
  initialDetectedInterfaceLanguage: LanguageOption | null;
  persistenceId: string;
  paymentBypassEnabled?: boolean;
  versionsPerGeneration?: number;
  initialPhonePrefixes: PhonePrefixOption[];
}) {
  const state = useDemoState(
    mode,
    initialProfile,
    initialBalance,
    initialCreditPlans,
    initialOccasions,
    initialMusicStyles,
    initialRecipientRelations,
    initialLibraryCollections,
    initialInterfaceLanguages,
    initialLyricsLanguages,
    initialDetectedInterfaceLanguage,
    persistenceId,
    paymentBypassEnabled,
    versionsPerGeneration,
    initialPhonePrefixes,
  );
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
            ? "Hors ligne — les données de cette démonstration restent locales."
            : "Hors ligne — certaines données peuvent être indisponibles."}
        </InlineNotice>
      )}
      {children}
      {state.message && (
        <div className="demo-notice">
          <InlineNotice tone="info" onDismiss={() => state.notify("")}>
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
