import assets from "./assets.json";
export default function Image({ ar, prompt, className = "" }: { ar: string; prompt: string; className?: string }) {
  const src = (assets as Record<string, string>)[`${ar}\n${prompt}`];
  const description = /choir|church/i.test(prompt)
    ? "Chœur gospel dans une église africaine"
    : /couple|romantic/i.test(prompt)
      ? "Couple dansant dans la lumière du coucher de soleil"
      : /concert|festival|stage/i.test(prompt)
        ? "Scène musicale et public en Afrique"
        : /sunset|sunrise|landscape/i.test(prompt)
          ? "Paysage africain dans une lumière chaleureuse"
          : /singer|musician|studio/i.test(prompt)
            ? "Artiste dans un univers musical"
            : "Illustration musicale MusikPro";
  return (
    <img
      src={src}
      alt={description}
      className={className}
      style={{
        aspectRatio: ar.replace(":", " / "),
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}
