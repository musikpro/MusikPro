import { icons, type LucideIcon } from "lucide-react";
export default function Icon({ i, size = 20, className = "" }: { i: string; size?: number; className?: string }) {
  const aliases: Record<string, string> = {
    home: "House",
    "plus-circle": "CirclePlus",
    "bar-chart-2": "ChartNoAxesColumnIncreasing",
    "music-2": "Music2",
    "edit-2": "Pencil",
    // lucide-react no longer exports a distinct "Trash2" icon (only "Trash") — without this
    // alias every "trash-2" usage silently fell back to the default Music icon below.
    "trash-2": "Trash",
  };
  const name =
    aliases[i] ??
    i
      .split("-")
      .map((v) => v[0].toUpperCase() + v.slice(1))
      .join("");
  const Component: LucideIcon = icons[name as keyof typeof icons] ?? icons.Music;
  return <Component size={size} className={className} aria-hidden="true" strokeWidth={2} />;
}
