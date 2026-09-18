"use client";
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
  const recentSongs = demo.songs.slice(0, 2).map((song) => ({
    title: song.title,
    style: song.style,
    occasion: song.occasion,
    versions: song.versions.length,
    plays: song.versions.reduce((total, version) => total + version.plays, 0),
    likes: demo.versionFavorites.filter((key) =>
      key.startsWith(`${song.title}|`),
    ).length,
  }));
  return (
    <div className="bg-background flex flex-col">
      <MobileTopBar credits={3} />

      {/* Greeting */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="font-headings font-bold text-2xl text-foreground">
          {`Bonjour ${demo.profile.name.split(" ")[0]} 👋`}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("Il te reste 3 chansons")}
        </p>
      </div>

      {/* CTA Créer */}
      <div className="px-4 mb-5">
        <button
          type="button"
          data-demo-ready
          onClick={() => demo.go("/dashboard/create")}
          aria-label="Créer une chanson"
          className="musik-create-hero w-full bg-primary rounded-xl px-5 py-4 flex items-center gap-4"
          style={{ boxShadow: "0 4px 20px rgba(242,101,34,0.35)" }}
        >
          <div className="w-10 h-10 bg-primary-foreground/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon i="plus" size={22} className="text-primary-foreground" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-base text-primary-foreground">
              {t("+ Créer une chanson")}
            </p>
            <p className="text-xs text-primary-foreground/80">
              {t("Afrobeat, Amapiano, Gospel…")}
            </p>
          </div>
          <Icon
            i="chevron-right"
            size={18}
            className="text-primary-foreground/70"
          />
        </button>
      </div>

      {/* Concours Banner */}
      <div className="px-4 mb-5 hidden">
        <div className="bg-gradient-to-r from-secondary to-card border border-primary/20 rounded-xl p-4 flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">
              {t("Concours — Voix d'Afrique")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("Se termine le 31 juillet · 50 000 FCFA")}
            </p>
          </div>
          <button
            type="button"
            data-demo-ready
            onClick={() =>
              demo.notify("Action de démonstration : service non connecté.")
            }
            aria-label="Action de démonstration"
            className="text-xs font-bold text-primary bg-secondary px-3 py-1.5 rounded-lg flex-shrink-0"
          >
            {t("Participer")}
          </button>
        </div>
      </div>

      {/* Mes chansons */}
      <div className="px-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-headings font-bold text-lg text-foreground">
            {t("Mes chansons")}
          </h2>
          <a
            href="/dashboard/songs"
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
          {recentSongs.map((s) => (
            <SongCard key={s.title} {...s} />
          ))}
        </div>
      </div>

      {/* Tendances */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-headings font-bold text-lg text-foreground">
            {t("Tendances")}
          </h2>
          <a
            href="/dashboard/discover"
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
        <div className="bg-gradient-to-br from-primary/10 to-secondary rounded-xl p-5 border border-primary/20">
          <h2 className="font-headings font-bold text-lg text-foreground mb-3">
            {t("Télécharger l'application")}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("Créez vos chansons partout, n'importe quand")}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              data-demo-ready
              onClick={() =>
                demo.notify("Action de démonstration : service non connecté.")
              }
              aria-label="Action de démonstration"
              className="flex-1 bg-black text-white rounded-full px-4 py-3 flex items-center justify-center gap-2 font-semibold text-sm"
            >
              {/* Play Store Official Logo */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 13.5v8.8c0 .84.56 1.54 1.29 1.54h16.42c.73 0 1.29-.7 1.29-1.54v-8.8M3.29 3.29L12 12.57l8.71-9.28c-.42-.28-.91-.29-1.42-.29H4.71c-.51 0-1 .01-1.42.29z M3 10.5l8.94 6.06 8.06-6.06" />
              </svg>
              {t("Play Store")}
            </button>
            <button
              type="button"
              data-demo-ready
              onClick={() =>
                demo.notify("Action de démonstration : service non connecté.")
              }
              aria-label="Action de démonstration"
              className="flex-1 bg-black text-white rounded-full px-4 py-3 flex items-center justify-center gap-2 font-semibold text-sm"
            >
              {/* App Store Official Logo */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 13.5c-.73 0-1.38.2-1.96.58.15-1.34.73-2.54 1.6-3.49.52-.56.85-1.3.85-2.11 0-1.66-1.34-3-3-3-.87 0-1.63.37-2.16.95-.3.33-.56.71-.75 1.13-.08.17-.15.34-.21.52H9.3c.19-.74.49-1.43.88-2.06.95-1.57 2.78-2.63 4.82-2.63 3.03 0 5.5 2.47 5.5 5.5 0 1.04-.29 2.01-.8 2.85-.51.87-1.29 1.63-2.25 2.14M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z" />
              </svg>
              {t("App Store")}
            </button>
          </div>
        </div>
      </div>

      {/* Témoignages */}
      <div className="px-4 mb-6">
        <h2 className="font-headings font-bold text-lg text-foreground mb-3">
          {t("Témoignages")}
        </h2>
        <div className="flex flex-col gap-3">
          {testimonials.map((testimonial, idx) => (
            <div
              key={idx}
              className="bg-card border border-border rounded-xl p-4"
            >
              {/* Rating */}
              <div className="flex gap-0.5 mb-2">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Icon
                    key={i}
                    i="star"
                    size={14}
                    className="text-yellow-500"
                  />
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
                  <p className="text-xs font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role}
                  </p>
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
