"use client";
import assets from "./assets.json";
import { useDemo } from "./DemoProvider";
import { getNameInitials } from "@/lib/profile/name-initials";
import { translate as t } from "@/lib/i18n/translate";
export default function UserAvatar({
  gender,
  ageGroup,
  heritage,
  index,
  className = "",
}: {
  gender: string;
  ageGroup: string;
  heritage: string;
  index: number;
  className?: string;
}) {
  const demo = useDemo();
  if (!demo.isDemo) {
    const initials = getNameInitials(demo.profile.name);
    return (
      <span
        aria-label={`Profil de ${demo.profile.name}`}
        role="img"
        className={`${className} musik-user-avatar inline-flex aspect-square items-center justify-center`}
      >
        {initials}
      </span>
    );
  }
  const src =
    (assets as Record<string, string>)[`/banani-avatars/avatar/${gender}/${ageGroup}/${heritage}/${index}`] ??
    (assets as Record<string, string>)[`/avatar/${gender}/${ageGroup}/${heritage}/${index}`];
  return (
    <img
      src={src}
      alt={t("Photo de profil MusikPro")}
      className={className}
      style={{ objectFit: "cover", borderRadius: "50%", display: "block" }}
    />
  );
}
