import type { MetadataRoute } from "next";
import { SITE } from "@/constants/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name}: design kits for AI coding agents`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#efeee8",
    theme_color: "#0d7268",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
