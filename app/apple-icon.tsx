import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Icône d'écran d'accueil iOS : l'icône carrée plein cadre de la marque (public/icon-512.png).
// iOS applique lui-même l'arrondi, donc l'image ne doit contenir ni coins transparents ni disque.
export default async function AppleIcon() {
  const icon = await readFile(path.join(process.cwd(), "public", "icon-512.png"));
  const src = `data:image/png;base64,${icon.toString("base64")}`;

  return new ImageResponse(
    <img src={src} alt="" width={size.width} height={size.height} style={{ width: "100%", height: "100%" }} />,
    size,
  );
}
