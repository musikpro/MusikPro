const t = (text: string) => text;
import Icon from "./Icon";

export const displayName = "App Logo";
export const shortDescription = "MusikPro logo mark + wordmark";

export default function AppLogo({ size = "md", dark = false }) {
  const sizes: Record<string, { icon: number; text: string }> = {
    sm: { icon: 28, text: "text-base" },
    md: { icon: 36, text: "text-xl" },
    lg: { icon: 48, text: "text-2xl" },
  };
  const s = sizes[size] || sizes.md;
  return (
    <div className="flex items-center gap-2">
      <div
        className="bg-primary rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ width: s.icon, height: s.icon }}
      >
        <Icon
          i="music-2"
          size={s.icon * 0.55}
          className="text-primary-foreground"
        />
      </div>
      <span
        className={`font-headings font-bold ${s.text} ${dark ? "text-foreground" : "text-foreground"}`}
      >
        {t("MusikPro")}
      </span>
    </div>
  );
}
