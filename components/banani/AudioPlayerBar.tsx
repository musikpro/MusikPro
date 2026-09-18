const t = (text: string) => text;
import Icon from "./Icon";

export const displayName = "Audio Player Bar";
export const shortDescription =
  "Inline audio player with waveform visualization";

export default function AudioPlayerBar({
  title = "Pour toi Mariam",
  duration = "3:24",
  version = 1,
}) {
  const bars = [
    3, 5, 8, 6, 9, 7, 4, 10, 8, 6, 5, 9, 7, 4, 6, 8, 5, 7, 9, 6, 4, 8, 7, 5,
  ];
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t("Version")} {version}
        </span>
        <span className="text-xs text-muted-foreground">{duration}</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon i="play" size={16} className="text-primary-foreground" />
        </button>
        <div className="flex-1 flex items-end gap-0.5 h-8">
          {bars.map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm ${i < 10 ? "bg-primary" : "bg-muted"}`}
              style={{ height: `${h * 3}px` }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-muted px-3 py-1.5 rounded-md">
          <Icon i="download" size={12} /> {t("MP3")}
        </button>
        <button className="flex items-center gap-1.5 text-xs font-semibold text-success bg-green-50 px-3 py-1.5 rounded-md">
          <Icon i="share-2" size={12} /> {t("WhatsApp")}
        </button>
        <button className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-md ml-auto">
          <Icon i="heart" size={12} /> {t("Favoris")}
        </button>
      </div>
    </div>
  );
}
