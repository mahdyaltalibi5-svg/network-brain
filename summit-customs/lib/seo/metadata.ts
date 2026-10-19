import type { Metadata } from "next";
import { business, SITE_URL } from "@/content/business";

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  keywords?: string[];
};

/** Every route builds its metadata through here: unique title, description, canonical, OG and Twitter. */
export function pageMeta({
  title,
  description,
  path,
  type = "website",
  publishedTime,
  modifiedTime,
  keywords,
}: PageMetaInput): Metadata {
  const url = new URL(path, SITE_URL).toString();
  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: business.name,
      locale: "en_US",
      ...(type === "article" ? { publishedTime, modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
