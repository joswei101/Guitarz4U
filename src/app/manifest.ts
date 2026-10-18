import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Guitarz4U",
    short_name: "Guitarz4U",
    description: "Second-hand guitars, repairs and guitar buying in Johannesburg.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5EBD8",
    theme_color: "#241A16",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
