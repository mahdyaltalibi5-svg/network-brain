import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/business";
import { allRoutes, CONTENT_UPDATED } from "@/content/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  return allRoutes.map((r) => ({
    url: new URL(r.path, SITE_URL).toString(),
    lastModified: r.lastModified ?? CONTENT_UPDATED,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
