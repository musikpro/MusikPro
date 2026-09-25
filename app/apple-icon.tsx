import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ff5a0a",
        borderRadius: "50%",
      }}
    >
      <svg width="126" height="126" viewBox="0 0 64 64">
        <path d="M38 15v25.2a9.5 9.5 0 1 1-4-7.75V19.3l15 5.7v6.2l-11-4.15V15Z" fill="#fff" />
      </svg>
    </div>,
    size,
  );
}
