"use client";
import assets from "./assets.json";
import { useDemo } from "./DemoProvider";
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
    const initials = demo.profile.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "MP";
    return (
      <span
        aria-label={`Profil de ${demo.profile.name}`}
        className={`${className} inline-flex aspect-square items-center justify-center bg-secondary font-bold text-primary`}
        style={{ borderRadius: "50%" }}
      >
        {initials}
      </span>
    );
  }
  const src =
    (assets as Record<string, string>)[
      `/banani-avatars/avatar/${gender}/${ageGroup}/${heritage}/${index}`
    ] ??
    (assets as Record<string, string>)[
      `/avatar/${gender}/${ageGroup}/${heritage}/${index}`
    ];
  return (
    <img
      src={src}
      alt="Photo de profil MusikPro"
      className={className}
      style={{ objectFit: "cover", borderRadius: "50%", display: "block" }}
    />
  );
}
