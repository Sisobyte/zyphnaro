import type { MetadataRoute } from "next";

// Lets phones "Add to home screen" with the Zyphnaro icon and brand colour.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zyphnaro",
    short_name: "Zyphnaro",
    description: "Don't just find opportunities. Know which ones are worth pursuing.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3d5afe",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
