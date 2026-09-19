"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  demoGeneratedSongs,
  demoLibrarySongs,
  demoDiscoverSongs,
  demoFavoriteSongs,
  demoSongPacks,
  demoLyrics,
} from "@/lib/demo/musikpro-data";

function useDemoState() {
  const router = useRouter();
  const [message, notify] = useState("");
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => notify(""), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);
  const [fields, setFields] = useState<Record<string, string>>({
    story: "",
    recipientName: "",
    recipientPronunciation: "",
    lyrics: demoLyrics,
    detail: "",
    "profile.name": "Kofi Mensah",
    "profile.email": "kofi.mensah@example.com",
    "profile.location": "Accra, Ghana",
    "support.subject": "",
    "support.category": "Problème technique",
    "support.message": "",
    "support.email": "kofi.mensah@example.com",
    "support.phone": "",
    "payment.name": "Jean Dupont",
    "payment.email": "jean@example.com",
    "payment.phone": "",
  });
  const [choices, setChoices] = useState<Record<string, string>>({
    occasion: "Anniversaire",
    genre: "Afrobeat",
    mood: "Énergique",
    language: "Français",
    voice: "Femme",
    theme: "Clair",
    appLanguage: "Français",
    currency: "XOF",
    recipientRelation: "",
  });
  const [profile, setProfile] = useState({
    name: "Kofi Mensah",
    email: "kofi.mensah@example.com",
    location: "Accra, Ghana",
  });
  const [songs, setSongs] = useState(demoGeneratedSongs);
  const [favorites, setFavorites] = useState<string[]>(
    demoFavoriteSongs.map((s) => s.title),
  );
  const [versionFavorites, setVersionFavorites] = useState<string[]>(
    demoGeneratedSongs.flatMap((s) =>
      s.versions.flatMap((v, i) => (v.liked ? [`${s.title}|${i}`] : [])),
    ),
  );
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
  const [selectedTitle, setSelectedTitle] = useState("Mama Africa");
  const [selectedVersion, setSelectedVersion] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [packIndex, setPackIndex] = useState(1);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const library = [
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
  ];
  const favoriteSongs = favorites.map((title, i) => {
    const original = demoFavoriteSongs.find((s) => s.title === title);
    const own = songs.find((s) => s.title === title);
    const publicSong = library.find((s) => s.title === title);
    return {
      id: i,
      title,
      occasion: original?.occasion ?? own?.occasion ?? "Communauté",
      style: original?.style ?? own?.style ?? publicSong?.style ?? "Afrobeat",
      plays:
        original?.plays ??
        own?.versions.reduce((n, v) => n + v.plays, 0) ??
        publicSong?.plays ??
        0,
      img: original?.img ?? publicSong?.img ?? "",
    };
  });
  const owned = songs.find((s) => s.title === selectedTitle);
  const currentSong = owned
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
        style: "Création de démonstration",
        img: "",
        duration: "1:32",
        artist: profile.name,
        likes: 0,
      });
  const go = (route: string) => {
    notify("");
    router.push(route);
  };
  const field = (key: string, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));
  const choose = (key: string, value: string) =>
    setChoices((prev) => ({ ...prev, [key]: value }));
  const toggle = (key: string) =>
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleFavorite = (title: string) =>
    setFavorites((prev) =>
      prev.includes(title) ? prev.filter((v) => v !== title) : [...prev, title],
    );
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
    const index = library.findIndex((s) => s.title === selectedTitle);
    setSelectedTitle(
      library[(index + direction + library.length) % library.length].title,
    );
  };
  const generateSong = () => {
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
    setSelectedTitle(title);
    go("/dashboard/songs");
  };
  return {
    message,
    notify,
    fields,
    field,
    choices,
    choose,
    profile,
    setProfile,
    songs,
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
    pack: demoSongPacks[packIndex],
    paymentConfirmed,
    setPaymentConfirmed,
    generateSong,
    removeSong: (title: string) => {
      setSongs((prev) => prev.filter((s) => s.title !== title));
      setFavorites((prev) => prev.filter((v) => v !== title));
      setVersionFavorites((prev) =>
        prev.filter((v) => !v.startsWith(`${title}|`)),
      );
      notify("Chanson retirée de cette démonstration locale.");
    },
    go,
  };
}

type DemoState = ReturnType<typeof useDemoState>;
const Context = createContext<DemoState | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const state = useDemoState();
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
        <p role="status" className="demo-offline">
          Hors ligne — les données de cette démonstration restent locales.
        </p>
      )}
      {children}
      {state.message && (
        <button
          type="button"
          className="demo-notice"
          role="status"
          onClick={() => state.notify("")}
        >
          {state.message}
          <span className="sr-only"> Fermer le message</span>
        </button>
      )}
    </Context.Provider>
  );
}
export function useDemo() {
  const state = useContext(Context);
  if (!state) throw new Error("DemoProvider requis");
  return state;
}
