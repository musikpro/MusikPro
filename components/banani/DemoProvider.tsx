"use client";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { demoLibrarySongs, demoDiscoverSongs, demoFavoriteSongs, demoLyrics } from "@/lib/demo/musikpro-data";
import { InlineNotice } from "@/components/ui/inline-notice";
import { authClient } from "@/lib/auth/client";
import { dashboardHref, normalizeDashboardPath } from "@/lib/demo/routing";
import { getWorkspaceDefaults } from "@/lib/demo/workspace-defaults";
import { demoCreationChoicesSchema } from "@/lib/validation/musikpro-demo";
import { CREDITS_PER_GENERATION, type CreditPlanOption } from "@/lib/credit-plans/catalog";
import type { OccasionOption } from "@/lib/occasions/catalog";
import type { LibraryCollectionOption } from "@/lib/library-collections/catalog";
import type { LanguageOption } from "@/lib/languages/catalog";
import { apiFetch } from "@/lib/api/client";

type DemoProfile = { name: string; email: string; location: string };

function useDemoState(
  mode: "demo" | "real",
  initialProfile: DemoProfile,
  initialBalance: number,
  initialCreditPlans: CreditPlanOption[],
  initialOccasions: OccasionOption[],
  initialLibraryCollections: LibraryCollectionOption[],
  initialInterfaceLanguages: LanguageOption[],
  initialLyricsLanguages: LanguageOption[],
  initialDetectedInterfaceLanguage: LanguageOption | null,
  persistenceId: string,
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
    window.queueMicrotask(() =>
      setChoices((current) => ({ ...current, appLanguage: selected })),
    );
    document.documentElement.lang =
      initialInterfaceLanguages.find((language) => language.nativeName === selected)?.code ?? "fr";
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
  const libraryCollections = initialLibraryCollections;
  const interfaceLanguages = initialInterfaceLanguages;
  const lyricsLanguages = initialLyricsLanguages;
  const occasionEmoji = (name: string) => occasions.find((occasion) => occasion.name === name)?.emoji ?? "";
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
  const currentSong = selectedTitle
    ? owned
      ? {
          id: owned.id,
          title: owned.title,
          style: owned.style,
          img: "",
          duration: owned.versions[selectedVersion]?.duration ?? "1m 32s",
          artist: profile.name,
          likes: owned.versions[selectedVersion]?.plays ?? 0,
        }
      : (library.find((s) => s.title === selectedTitle) ?? {
          id: -1,
          title: selectedTitle,
          style: isDemo ? "Création de démonstration" : "Création MusikPro",
          img: "",
          duration: "1:32",
          artist: profile.name,
          likes: 0,
        })
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
  const field = (key: string, value: string) => setFields((prev) => ({ ...prev, [key]: value }));
  const choose = (key: string, value: string) => {
    const nextChoices = { ...choices, [key]: value };
    setChoices(nextChoices);
    if (key === "appLanguage") {
      window.localStorage.setItem(`musikpro:interface-language:${persistenceId}`, value);
      document.documentElement.lang =
        initialInterfaceLanguages.find((language) => language.nativeName === value)?.code ?? "fr";
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
  const toggle = (key: string) => setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleFavorite = (title: string) =>
    setFavorites((prev) => (prev.includes(title) ? prev.filter((v) => v !== title) : [...prev, title]));
  const toggleVersion = (title: string, index: number) => {
    const key = `${title}|${index}`;
    const next = versionFavorites.includes(key)
      ? versionFavorites.filter((v) => v !== key)
      : [...versionFavorites, key];
    setVersionFavorites(next);
    setFavorites((prev) =>
      next.some((v) => v.startsWith(`${title}|`))
        ? prev.includes(title)
          ? prev
          : [...prev, title]
        : prev.filter((v) => v !== title),
    );
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
  const generateSong = () => {
    if (!isDemo) {
      notify("La génération musicale réelle doit être connectée avant d’ajouter une chanson.");
      return;
    }
    if (balance < CREDITS_PER_GENERATION) {
      router.push(href("/dashboard/credits"));
      notify(`Il faut ${CREDITS_PER_GENERATION} crédits pour lancer une génération musicale.`);
      return;
    }
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
              date: isDemo ? "Session de démonstration" : "Session MusikPro",
              versions: [
                {
                  label: "Version 1",
                  duration: "1m 32s",
                  plays: 0,
                  liked: false,
                },
                {
                  label: "Version 2",
                  duration: "1m 45s",
                  plays: 0,
                  liked: false,
                },
              ],
            },
            ...prev,
          ],
    );
    setBalance((current) => Math.max(0, current - CREDITS_PER_GENERATION));
    setSelectedTitle(title);
    go("/dashboard/songs");
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
    libraryCollections,
    interfaceLanguages,
    lyricsLanguages,
    occasionEmoji,
    favorites,
    favoriteSongs,
    versionFavorites,
    toggleFavorite,
    toggleVersion,
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
    pack: songPacks[packIndex] ?? null,
    paymentConfirmed,
    setPaymentConfirmed,
    generateSong,
    generateLyrics,
    lyricsPending,
    removeSong: (title: string) => {
      setSongs((prev) => prev.filter((s) => s.title !== title));
      setFavorites((prev) => prev.filter((v) => v !== title));
      setVersionFavorites((prev) => prev.filter((v) => !v.startsWith(`${title}|`)));
      notify(isDemo ? "Chanson retirée de cette démonstration locale." : "Chanson retirée.");
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
  initialLibraryCollections,
  initialInterfaceLanguages,
  initialLyricsLanguages,
  initialDetectedInterfaceLanguage,
  persistenceId,
}: {
  children: ReactNode;
  mode: "demo" | "real";
  initialProfile: DemoProfile;
  initialBalance?: number;
  initialCreditPlans: CreditPlanOption[];
  initialOccasions: OccasionOption[];
  initialLibraryCollections: LibraryCollectionOption[];
  initialInterfaceLanguages: LanguageOption[];
  initialLyricsLanguages: LanguageOption[];
  initialDetectedInterfaceLanguage: LanguageOption | null;
  persistenceId: string;
}) {
  const state = useDemoState(
    mode,
    initialProfile,
    initialBalance,
    initialCreditPlans,
    initialOccasions,
    initialLibraryCollections,
    initialInterfaceLanguages,
    initialLyricsLanguages,
    initialDetectedInterfaceLanguage,
    persistenceId,
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
