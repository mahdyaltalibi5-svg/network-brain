import type { MetadataRoute } from "next";

/** Installable app: Add to Home Screen opens straight into the Respond screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Summit CRM",
    short_name: "Summit",
    description: "Leads, speed to lead and website updates for Summit Customs.",
    start_url: "/now",
    scope: "/",
    display: "standalone",
    background_color: "#07080A",
    theme_color: "#07080A",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
