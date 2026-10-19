import type { MetadataRoute } from "next";

/** Web-app-manifest: naam, kleuren en icoon als je Beursradar op je startscherm zet. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Beursradar",
    short_name: "Beursradar",
    description: "Aandelen, ETF's en crypto: live koersen, getoetste tips en uitleg in gewone taal.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0e14",
    theme_color: "#0b0e14",
    lang: "nl",
    categories: ["finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
