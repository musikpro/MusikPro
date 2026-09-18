import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo/site";

export const alt = `${siteConfig.name} — aperçu du site`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "72px",
        background: "linear-gradient(135deg, #0b1020 0%, #18213f 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 30, opacity: 0.8, marginBottom: 22 }}>Mobile-first SaaS</div>
      <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{siteConfig.name}</div>
      <div style={{ fontSize: 34, marginTop: 28, maxWidth: 930, lineHeight: 1.3, opacity: 0.9 }}>
        {siteConfig.description}
      </div>
      <div style={{ display: "flex", marginTop: 46, fontSize: 25, opacity: 0.75 }}>
        Next.js • Afrique • Mobile Money • Sécurité • SEO
      </div>
    </div>,
    size,
  );
}
