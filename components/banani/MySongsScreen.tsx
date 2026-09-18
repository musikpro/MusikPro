"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

export const displayName = "Mes chansons";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import SongCard from "./SongCard";
import Icon from "./Icon";

const mySongs = [
  {
    title: "Pour toi Mariam",
    style: "Afrobeat",
    occasion: "Anniversaire",
    versions: 2,
    plays: 1240,
    likes: 87,
  },
  {
    title: "Mon amour pour toi",
    style: "Amapiano",
    occasion: "Amour",
    versions: 2,
    plays: 530,
    likes: 42,
  },
  {
    title: "Rêve d'Afrique",
    style: "Gospel",
    occasion: "Motivation",
    versions: 1,
    plays: 890,
    likes: 156,
  },
  {
    title: "Danse la Nuit",
    style: "Zouglou",
    occasion: "Fête",
    versions: 3,
    plays: 2100,
    likes: 234,
  },
  {
    title: "Gratitude",
    style: "R&B",
    occasion: "Gratitude",
    versions: 1,
    plays: 420,
    likes: 89,
  },
];

export default function MySongsScreen() {
  const demo = useDemo();
  return (
    <div className="bg-background flex flex-col">
      <MobileTopBar credits={3} />

      {/* Header */}
      <div className="px-4 pt-4 pb-4">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">
          {t("Mes chansons")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Gérez vos créations musicales")}
        </p>
      </div>

      {/* Filter/Sort */}
      <div className="px-4 pb-4 flex gap-2">
        <div className="border border-border rounded-lg px-3 py-2 bg-input flex items-center gap-2 flex-1">
          <Icon i="filter" size={14} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{t("Trier")}</p>
        </div>
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/songs")}
          aria-label="Voir les versions de mes chansons"
          className="border border-border rounded-lg px-3 py-2 bg-input"
        >
          <Icon i="list" size={16} className="text-muted-foreground" />
        </button>
      </div>

      {/* My Songs List */}
      <div className="flex-1 px-4 pb-6 overflow-y-auto space-y-3">
        {mySongs.map((song) => (
          <SongCard key={song.title} {...song} />
        ))}
      </div>

      <MobileBottomNav activeTab={t("Mes chansons")} />
    </div>
  );
}
