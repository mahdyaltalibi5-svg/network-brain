import type { MetadataRoute } from "next";
import { cities } from "@/lib/cities";
import { products } from "@/lib/products";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/shop", "/about", "/coas", "/faq", "/work-with-us", "/research-use", "/shipping", "/refunds", "/contact", "/terms", "/privacy"];
  return [
    ...pages.map((p) => ({ url: `${site.url}${p}`, priority: p === "" || p === "/shop" ? 1 : 0.5 })),
    ...products.map((p) => ({ url: `${site.url}/p/${p.slug}`, priority: 0.8 })),
    ...cities.map((c) => ({ url: `${site.url}/utah/${c.slug}`, priority: 0.7 })),
  ];
}
