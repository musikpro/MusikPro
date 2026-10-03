import assets from "./assets.json";
import { translate as t } from "@/lib/i18n/translate";
export default function Image({ ar, prompt, className = "" }: { ar: string; prompt: string; className?: string }) {
  const src = (assets as Record<string, string>)[`${ar}\n${prompt}`];
  const description = /choir|church/i.test(prompt)
    ? t("Chœur gospel dans une église africaine")
    : /couple|romantic/i.test(prompt)
      ? t("Couple dansant dans la lumière du coucher de soleil")
      : /concert|festival|stage/i.test(prompt)
        ? t("Scène musicale et public en Afrique")
        : /sunset|sunrise|landscape/i.test(prompt)
          ? t("Paysage africain dans une lumière chaleureuse")
          : /singer|musician|studio/i.test(prompt)
            ? t("Artiste dans un univers musical")
            : t("Illustration musicale MusikPro");
  return (
    // eslint-disable-next-line @next/next/no-img-element -- illustrations locales pré-générées (assets.json), dimensionnées par aspect-ratio
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
