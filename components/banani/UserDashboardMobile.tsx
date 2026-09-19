"use client";
import { useState } from "react";
import { useDemo } from "./DemoProvider";

const t = (text: string) => text;

export const displayName = "Dashboard Utilisateur Mobile";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import SongCard from "./SongCard";
import Icon from "./Icon";
import Image from "./Image";
import UserAvatar from "./UserAvatar";
import StoreDownloadCard from "./StoreDownloadCard";
import QuickLanguageSelect from "./QuickLanguageSelect";

const trendingSongs = [
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
    title: "Heartbeat Rhythm",
    plays: "9.2k",
    img: "modern African music festival outdoor stage with sunset, dancing crowd",
  },
  {
    title: "Eternal Love Song",
    plays: "11k",
    img: "romantic African sunset scene with couple dancing, warm golden hour lighting",
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

export default function UserDashboardMobile() {
  const demo = useDemo();
  const [launching, setLaunching] = useState(false);
  const openCreator = () => {
    if (launching) return;
    setLaunching(true);
    window.setTimeout(() => demo.go("/dashboard/create"), 180);
  };
  const recentSongs = demo.songs.slice(0, 2).map((song) => ({
    title: song.title,
    style: song.style,
    occasion: song.occasion,
    versions: song.versions.length,
    plays: song.versions.reduce((total, version) => total + version.plays, 0),
    likes: demo.versionFavorites.filter((key) => key.startsWith(`${song.title}|`)).length,
  }));
  return (
    <div className="bg-background flex flex-col">
      <MobileTopBar credits={demo.balance} />

      {/* Greeting */}
      <div className="dashboard-greeting px-4 pt-4 pb-3">
        <div>
          <h1 className="font-headings font-bold text-2xl text-foreground">
            {`Bonjour ${demo.profile.name.split(" ")[0]} 👋`}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {demo.balance > 0
              ? `Il te reste ${demo.balance} chanson${demo.balance > 1 ? "s" : ""}`
              : "Aucune chanson disponible"}
          </p>
        </div>
        <QuickLanguageSelect compact />
      </div>

      {/* CTA Créer */}
      <div className="px-4 mb-5">
        <button
          type="button"
          data-demo-ready
          onClick={openCreator}
          aria-label="Créer une chanson"
          aria-busy={launching}
          className={`musik-create-hero w-full bg-primary rounded-xl px-5 py-4 flex items-center gap-4 ${launching ? "is-launching" : ""}`}
          style={{ boxShadow: "0 4px 20px rgba(242,101,34,0.35)" }}
        >
          <div className="w-10 h-10 bg-primary-foreground/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon i="plus" size={22} className="text-primary-foreground" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-base text-primary-foreground">{t("+ Créer une chanson")}</p>
            <p className="text-xs text-primary-foreground/80">{t("Afrobeat, Amapiano, Gospel…")}</p>
          </div>
          <Icon i="chevron-right" size={18} className="text-primary-foreground/70" />
        </button>
      </div>

      {/* Concours Banner */}
      <div className="px-4 mb-5 hidden">
        <div className="bg-gradient-to-r from-secondary to-card border border-primary/20 rounded-xl p-4 flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">{t("Concours — Voix d'Afrique")}</p>
            <p className="text-xs text-muted-foreground">{t("Se termine le 31 juillet · 50 000 FCFA")}</p>
          </div>
          <button
            type="button"
            data-demo-ready
            onClick={() =>
              demo.notify(
                demo.isDemo
                  ? "Action de démonstration : service non connecté."
                  : "Cette fonctionnalité sera bientôt disponible.",
              )
            }
            aria-label="Participer au concours"
            className="text-xs font-bold text-primary bg-secondary px-3 py-1.5 rounded-lg flex-shrink-0"
          >
            {t("Participer")}
          </button>
        </div>
      </div>

      {/* Mes chansons */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
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
        <div className="flex flex-col gap-3">
          {recentSongs.length === 0 && (
            <div className="rounded-xl border border-border bg-card px-5 py-6 text-center">
              <Icon i="music-2" size={26} className="mx-auto mb-2 text-primary" />
              <p className="font-semibold text-foreground">Aucune chanson créée</p>
              <p className="mt-1 text-sm text-muted-foreground">Ta première chanson apparaîtra ici.</p>
            </div>
          )}
          {recentSongs.map((s) => (
            <SongCard key={s.title} {...s} />
          ))}
        </div>
      </div>

      {/* Tendances */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
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
        <div className="grid grid-cols-2 gap-2.5">
          {trendingSongs.map((t2) => (
            <div key={t2.title} className="rounded-xl overflow-hidden relative">
              <Image ar="1:1" prompt={t2.img} className="w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-3">
                <p className="text-white font-bold text-xs">{t2.title}</p>
                <p className="text-white/70 text-xs flex items-center gap-1">
                  <Icon i="headphones" size={10} /> {t2.plays}
                </p>
              </div>
              <button
                type="button"
                data-demo-ready
                onClick={() => demo.openSong(t2.title)}
                aria-label="Écouter la chanson"
                className="absolute top-2 right-2 w-8 h-8 bg-primary rounded-lg flex items-center justify-center"
              >
                <Icon i="play" size={12} className="text-primary-foreground" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Download App Section */}
      <div className="px-4 mb-6">
        <StoreDownloadCard />
      </div>

      {/* Témoignages */}
      <div className="px-4 mb-6">
        <h2 className="font-headings font-bold text-lg text-foreground mb-3">{t("Témoignages")}</h2>
        <div className="flex flex-col gap-3">
          {testimonials.map((testimonial, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-4">
              {/* Rating */}
              <div className="flex gap-0.5 mb-2">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Icon key={i} i="star" size={14} className="text-yellow-500" />
                ))}
              </div>

              {/* Testimonial text */}
              <p className="text-sm text-foreground mb-3">{testimonial.text}</p>

              {/* Author */}
              <div className="flex items-center gap-2">
                <UserAvatar
                  gender={testimonial.avatar}
                  ageGroup={testimonial.ageGroup}
                  heritage={testimonial.heritage}
                  index={idx}
                  className="w-8 h-8"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MobileBottomNav activeTab={t("Accueil")} />
    </div>
  );
}
