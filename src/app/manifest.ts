import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guitarz4U — Second-hand guitars",
    short_name: "Guitarz4U",
    description: "Second-hand equipment, first-hand service. Buy, sell and repair guitars in Johannesburg.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5EBD8",
    theme_color: "#241A16",
    lang: "en-ZA",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
