"use client";
import { useRef, useState } from "react";
import { useDemo } from "./DemoProvider";
import DesktopSidebar from "./DesktopSidebar";
import { translate as t } from "@/lib/i18n/translate";
import { downloadAudioFile } from "@/lib/demo/audio-actions";

export const displayName = "Dashboard Utilisateur Desktop";
export const screenSize = "desktop";

import SongCard from "./SongCard";
import Icon from "./Icon";
import Image from "./Image";
import UserAvatar from "./UserAvatar";
import StoreDownloadCard from "./StoreDownloadCard";
import QuickLanguageSelect from "./QuickLanguageSelect";
import WorkspaceBalanceCard from "./WorkspaceBalanceCard";

const trendingCards = [
  {
    title: "Mama Africa",
    plays: "12k",
    img: "vibrant African music concert stage with warm orange lights, celebration atmosphere",
  },
  {
    title: "Gloire à Toi",
    plays: "15k",
    img: "joyful gospel choir in colorful African church, warm sunlight, celebration",
  },
  {
    title: "Mon Rêve",
    plays: "8.5k",
    img: "modern African music production studio with neon lights and African instruments",
  },
  {
    title: "Danse avec Moi",
    plays: "11k",
    img: "energetic African street dance scene with colorful clothing and joyful atmosphere",
  },
];

const testimonials = [
  {
    name: "Aïssatou Traoré",
    role: "Mariée - Dakar",
    text: "J'ai créé une chanson pour les noces de mon frère. Tous les invités ont adoré ! C'était tellement personnel et spécial. Je recommande vivement !",
    rating: 5,
    avatar: "female",
    ageGroup: "25-35",
    heritage: "African",
  },
  {
    name: "Kofi Mensah",
    role: "Papa - Accra",
    text: "Pour l'anniversaire de ma fille, j'ai généré une chanson en Twi. Elle a pleuré de joie ! C'est devenu sa chanson préférée. Merci MusikPro !",
    rating: 5,
    avatar: "male",
    ageGroup: "35-50",
    heritage: "African",
  },
  {
    name: "Zara Okafor",
    role: "DJ - Lagos",
    text: "J'intègre les chansons de MusikPro dans mes sets. Les gens adorent la personnalisation ! C'est un outil puissant pour créer des moments inoubliables.",
    rating: 5,
    avatar: "female",
    ageGroup: "18-25",
    heritage: "African",
  },
];

export default function UserDashboardDesktop() {
  const demo = useDemo();
  const visibleTrends = demo.isDemo ? trendingCards : [];
  const visibleTestimonials = demo.isDemo ? testimonials : [];
  const [playingSongId, setPlayingSongId] = useState<string | number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recentSongs = demo.songs.slice(0, 2).map((song) => {
    const primaryVersion = song.versions[0];
    return {
      id: song.id,
      title: song.title,
      style: song.style,
      occasion: song.occasion,
      versions: song.versions.length,
      plays: song.versions.reduce((total, version) => total + version.plays, 0),
      likes: demo.versionFavorites.filter((key) => key.startsWith(`${song.title}|`)).length,
      audioUrl: primaryVersion?.audioUrl ?? null,
      versionStatus: primaryVersion?.status ?? "processing",
    };
  });
  const playSong = (song: (typeof recentSongs)[number]) => {
    if (demo.isDemo) {
      demo.openSong(song.title);
      return;
    }
    if (!song.audioUrl) {
      demo.notify("Cette chanson n’est pas encore prête à être écoutée.");
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (playingSongId === song.id) {
      audio.pause();
      setPlayingSongId(null);
      return;
    }
    audio.src = song.audioUrl;
    void audio.play().catch(() => demo.notify("La lecture a échoué. Réessaie dans un instant."));
    setPlayingSongId(song.id);
    demo.registerPlay(song.id, 0);
  };
  const downloadSong = async (song: (typeof recentSongs)[number]) => {
    if (demo.isDemo) {
      demo.notify("Action de démonstration : aucune opération réelle effectuée.");
      return;
    }
    if (!song.audioUrl) {
      demo.notify("Cette chanson n’est pas encore prête à être téléchargée.");
      return;
    }
    const ok = await downloadAudioFile(song.audioUrl, song.title);
    if (!ok) demo.notify("Le téléchargement a échoué. Réessaie dans un instant.");
  };
  const recentActivity = demo.songs.slice(0, 3).map((song, index) => ({
    action: index === 0 ? t("Chanson créée") : t("Chanson mise à jour"),
    song: song.title,
    time: index === 0 ? t("Récemment") : t("Cette semaine"),
  }));
  return (
    <div className="bg-background flex min-h-full font-body">
      <audio
        ref={audioRef}
        className="sr-only"
        onEnded={() => setPlayingSongId(null)}
        onError={() => {
          setPlayingSongId(null);
          demo.notify("Impossible de lire cette chanson pour le moment. Vérifie ta connexion et réessaie.");
        }}
        onStalled={() => demo.notify("La lecture est interrompue par une connexion instable. Patiente ou réessaie.")}
      />
      <DesktopSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-16 border-b border-border px-8 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-headings font-bold text-xl text-foreground">
              {`${t("Bonjour")} ${demo.profile.name.split(" ")[0]} 👋`}
            </h1>
            <p className="text-xs text-muted-foreground">
              {demo.balance > 0
                ? `Il te reste ${demo.balance} crédit${demo.balance > 1 ? "s" : ""}`
                : t("Aucun crédit disponible")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <QuickLanguageSelect />
            <button
              type="button"
              data-demo-ready
              onClick={() => demo.go("/dashboard/notifications")}
              aria-label="Notifications"
              className="relative"
            >
              <Icon i="bell" size={20} className="text-muted-foreground" />
              {demo.isDemo && <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />}
            </button>
            <UserAvatar gender="male" ageGroup="25-35" heritage="African" index={1} className="w-9 h-9 rounded-full" />
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 px-8 py-6 flex gap-6">
          {/* Center Column */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            {/* CTA Créer */}
            <button
              type="button"
              data-demo-ready
              onClick={() => demo.go("/dashboard/create")}
              aria-label="Créer une chanson"
              className="musik-create-hero w-full bg-primary rounded-xl px-6 py-5 flex items-center gap-5"
              style={{ boxShadow: "0 4px 20px rgba(242,101,34,0.35)" }}
            >
              <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon i="plus" size={24} className="text-primary-foreground" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-lg text-primary-foreground">{t("+ Créer une chanson")}</p>
                <p className="text-sm text-primary-foreground/80">{t("Afrobeat, Amapiano, Gospel…")}</p>
              </div>
              <Icon i="chevron-right" size={20} className="text-primary-foreground/70" />
            </button>

            <div className="bg-gradient-to-r from-secondary to-card border border-primary/20 rounded-xl p-5 flex items-center gap-4">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon i="trophy" size={25} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base text-foreground">
                  {demo.isDemo ? t("Concours — Voix d'Afrique") : t("Aucun concours en cours")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {demo.isDemo
                    ? t("Se termine le 31 juillet · 50 000 FCFA")
                    : t("Les prochains concours publiés apparaîtront ici.")}
                </p>
              </div>
              <button
                type="button"
                data-demo-ready
                onClick={() => demo.notify("Cette fonctionnalité sera bientôt disponible.")}
                aria-label={demo.isDemo ? "Participer au concours" : "Aucun concours disponible"}
                disabled={!demo.isDemo}
                className="text-sm font-bold text-primary bg-secondary px-5 py-2.5 rounded-lg flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {demo.isDemo ? t("Participer") : t("Indisponible")}
              </button>
            </div>

            {/* Mes chansons */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headings font-bold text-lg text-foreground">{t("Mes chansons")}</h2>
                <a
                  href={demo.href("/dashboard/songs")}
                  onClick={(e) => {
                    e.preventDefault();
                    demo.go("/dashboard/songs");
                  }}
                  className="text-sm font-semibold text-primary"
                >
                  {t("Voir tout")}
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {recentSongs.length === 0 && (
                  <div className="col-span-2 rounded-xl border border-border bg-card px-6 py-8 text-center">
                    <Icon i="music-2" size={28} className="mx-auto mb-2 text-primary" />
                    <p className="font-semibold text-foreground">{t("Aucune chanson créée")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("Ta première chanson apparaîtra ici.")}</p>
                  </div>
                )}
                {recentSongs.map((s) => (
                  <SongCard
                    key={s.id}
                    {...s}
                    isPlaying={playingSongId === s.id}
                    isPending={!demo.isDemo && s.versionStatus !== "completed" && s.versionStatus !== "failed"}
                    isFailed={!demo.isDemo && s.versionStatus === "failed"}
                    onPlay={() => playSong(s)}
                    onDownload={() => void downloadSong(s)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-headings font-bold text-lg text-foreground mb-4">{t("Témoignages")}</h2>
              <div className="grid grid-cols-3 gap-4">
                {visibleTestimonials.length === 0 && (
                  <div className="col-span-3 rounded-xl border border-border bg-card px-6 py-8 text-center">
                    <Icon i="message-square" size={26} className="mx-auto mb-2 text-primary" />
                    <p className="font-semibold text-foreground">{t("Aucun témoignage publié")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Les témoignages réels apparaîtront ici.</p>
                  </div>
                )}
                {visibleTestimonials.map((testimonial, idx) => (
                  <div key={idx} className="bg-card border border-border rounded-xl p-4">
                    {/* Rating */}
                    <div className="flex gap-0.5 mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Icon key={i} i="star" size={14} className="text-yellow-500" />
                      ))}
                    </div>

                    {/* Testimonial text */}
                    <p className="text-sm text-foreground mb-4 line-clamp-4">{testimonial.text}</p>

                    {/* Author */}
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        gender={testimonial.avatar}
                        ageGroup={testimonial.ageGroup}
                        heritage={testimonial.heritage}
                        index={idx}
                        className="w-10 h-10"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-80 flex-shrink-0 flex flex-col gap-6">
            <WorkspaceBalanceCard />

            <StoreDownloadCard compact />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headings font-bold text-lg text-foreground">{t("Tendances")}</h2>
                <a
                  href={demo.href("/dashboard/discover")}
                  onClick={(e) => {
                    e.preventDefault();
                    demo.go("/dashboard/discover");
                  }}
                  className="text-sm font-semibold text-primary"
                >
                  {t("Voir tout")}
                </a>
              </div>
              <div className="flex flex-col gap-3">
                {visibleTrends.length === 0 && (
                  <div className="rounded-xl border border-border bg-card px-5 py-7 text-center">
                    <Icon i="headphones" size={24} className="mx-auto mb-2 text-primary" />
                    <p className="text-sm font-semibold text-foreground">{t("Aucune tendance disponible")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Les chansons publiées apparaîtront ici.</p>
                  </div>
                )}
                {visibleTrends.map((tc) => (
                  <div key={tc.title} className="rounded-xl overflow-hidden relative h-28">
                    <Image ar="16:9" prompt={tc.img} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-3">
                      <p className="text-white font-bold text-sm">{tc.title}</p>
                      <p className="text-white/70 text-xs flex items-center gap-1">
                        <Icon i="headphones" size={10} /> {tc.plays}
                      </p>
                    </div>
                    <button
                      type="button"
                      data-demo-ready
                      onClick={() => demo.openSong(tc.title)}
                      aria-label="Écouter la chanson"
                      className="absolute top-2 right-2 w-8 h-8 bg-primary rounded-lg flex items-center justify-center"
                    >
                      <Icon i="play" size={12} className="text-primary-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-headings font-bold text-lg text-foreground mb-4">{t("Activité récente")}</h2>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {recentActivity.length === 0 && (
                  <div className="px-4 py-5 text-center">
                    <Icon i="clock" size={20} className="mx-auto mb-2 text-primary" />
                    <p className="text-sm font-semibold text-foreground">{t("Aucune activité récente")}</p>
                  </div>
                )}
                {recentActivity.map((act, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 ${i > 0 ? "border-t border-border" : ""}`}>
                    <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon i="zap" size={13} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{act.action}</p>
                      <p className="text-xs text-muted-foreground truncate">{act.song}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
