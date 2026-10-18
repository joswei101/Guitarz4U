import { ImageResponse } from "next/og";

export const alt = "Guitarz4U — Second-hand equipment, first-hand service.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "#241A16", padding: 80, gap: 60 }}>
        <svg width="260" height="260" viewBox="0 0 64 64">
          <path d="M32 3C51 3 61 13 59 26C57 41 43 56 32 61C21 56 7 41 5 26C3 13 13 3 32 3Z" fill="#38271F" stroke="#B08A52" strokeWidth="3" />
          <rect x="29" y="7" width="6" height="7" rx="1.5" fill="#D4B07A" />
          <rect x="30.6" y="12" width="2.8" height="20" fill="#D4B07A" />
          <circle cx="32" cy="35.5" r="6.8" fill="#B08A52" />
          <circle cx="32" cy="44" r="9" fill="#B08A52" />
          <circle cx="32" cy="38.5" r="2.6" fill="#38271F" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, color: "#FFF9EE", fontWeight: 700, display: "flex" }}>
            Guitarz<span style={{ color: "#B08A52" }}>4</span>U
          </div>
          <div style={{ fontSize: 40, color: "#D4B07A", marginTop: 10 }}>Second-hand equipment, first-hand service.</div>
          <div style={{ fontSize: 30, color: "#F5EBD8", marginTop: 30 }}>Buy · Sell · Repair guitars — Johannesburg</div>
        </div>
      </div>
    ),
    size,
  );
}
