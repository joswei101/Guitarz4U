import type { MetadataRoute } from "next";

// Installable web app (PWA) manifest. No offline caching service worker is
// registered, so stock and statuses are always fetched live.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guitarz4U — Second-hand guitars",
    short_name: "Guitarz4U",
    description: "Second-hand equipment, first-hand service. Pre-owned guitars, guitar buying and repairs in Johannesburg.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF9EE",
    theme_color: "#241A16",
    lang: "en-ZA",
    categories: ["shopping", "music"],
    icons: [
      { src: "/images/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/images/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/images/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
