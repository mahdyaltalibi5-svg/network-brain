import { posts } from "./journal/posts";

/** Every indexable route, used by the sitemap, llms.txt and the verification scripts. */
type RouteEntry = { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly"; lastModified?: string };

export const staticRoutes: RouteEntry[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/bespoke-suits", priority: 0.9, changeFrequency: "monthly" },
  { path: "/custom-wedding-suits-salt-lake-city", priority: 0.9, changeFrequency: "monthly" },
  { path: "/image-consulting", priority: 0.9, changeFrequency: "monthly" },
  { path: "/executive-wardrobe", priority: 0.9, changeFrequency: "monthly" },
  { path: "/fabrics", priority: 0.7, changeFrequency: "monthly" },
  { path: "/process", priority: 0.7, changeFrequency: "monthly" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.8, changeFrequency: "monthly" },
  { path: "/journal", priority: 0.6, changeFrequency: "weekly" },
  { path: "/book", priority: 0.8, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
];

export const allRoutes: RouteEntry[] = [
  ...staticRoutes,
  ...posts.map((p) => ({ path: `/journal/${p.slug}`, priority: 0.6, changeFrequency: "yearly" as const, lastModified: p.modified })),
];

/** Date of the last content change, used as lastModified for non-article pages. Bump when copy changes. */
export const CONTENT_UPDATED = "2026-10-19";
