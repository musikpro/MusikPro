import assets from "./assets.json";
import Icon from "./Icon";
import { translate as t } from "@/lib/i18n/translate";

// Fixed set of illustrative avatars from the Banani asset catalog (components/banani/assets.json) —
// decorative social proof, not photos of real MusikPro users. Shown on both demo and real dashboards,
// unlike UserAvatar which renders the signed-in visitor's own avatar/initials outside demo mode.
const socialProofAvatarKeys = [
  "/banani-avatars/avatar/female/18-25/African/2",
  "/banani-avatars/avatar/female/25-35/African/0",
  "/banani-avatars/avatar/male/25-35/African/0",
  "/banani-avatars/avatar/male/25-35/African/1",
  "/banani-avatars/avatar/male/35-50/African/1",
];

export default function SocialProofBadge({ className = "" }: { className?: string }) {
  const assetMap = assets as Record<string, string>;
  return (
    <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Icon key={i} i="star" size={22} className="fill-current text-yellow-500" />
        ))}
      </div>
      <div className="flex items-center">
        {socialProofAvatarKeys.map((key, idx) => (
          <img
            key={key}
            src={assetMap[key]}
            alt=""
            className={`w-11 h-11 rounded-full border-2 border-background object-cover ${idx > 0 ? "-ml-3" : ""}`}
          />
        ))}
        <span className="-ml-3 flex h-11 w-11 items-center justify-center rounded-full border-2 border-background bg-secondary text-xs font-bold text-primary">
          +998
        </span>
      </div>
      <p className="font-headings font-bold text-foreground">
        {t("Chansons générées par plus de 308 000 personnes")}
      </p>
    </div>
  );
}
