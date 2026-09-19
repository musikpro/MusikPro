import assets from "./assets.json";
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
