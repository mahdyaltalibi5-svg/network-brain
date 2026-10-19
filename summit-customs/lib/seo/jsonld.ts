import { business, founder, SITE_URL } from "@/content/business";
import type { Faq } from "@/content/faq";
import type { Service } from "@/content/services";
import { ratingSource, reviews } from "@/content/reviews";
import { isPh, real } from "@/lib/ph";

/**
 * JSON-LD builders. Placeholder values are never published: real() drops them,
 * and entries that depend on missing facts are omitted until supplied.
 */
type Json = Record<string, unknown>;

export const ids = {
  org: `${SITE_URL}/#organization`,
  business: `${SITE_URL}/#business`,
  website: `${SITE_URL}/#website`,
  founder: `${SITE_URL}/about#founder`,
};

const abs = (path: string) => new URL(path, SITE_URL).toString();

/** Strip inline link markup to plain text for schema answers. */
function toPlain(text: string) {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
}

function compact<T extends Json>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)),
  ) as T;
}

const cities = business.areaServed.map((name) =>
  compact({
    "@type": "City",
    name,
    containedInPlace: { "@type": "State", name: "Utah" },
  }),
);

export function organization(): Json {
  return compact({
    "@type": "Organization",
    "@id": ids.org,
    name: business.name,
    url: SITE_URL,
    logo: business.logo,
    description: business.shortDescription,
    legalName: real(business.legalName),
    foundingDate: real(business.foundingYear),
    sameAs: real([...business.sameAs]),
    founder: isPh(founder.name) ? undefined : { "@id": ids.founder },
  });
}

export function localBusiness(): Json {
  const lat = Number(real(business.geo.latitude));
  const lng = Number(real(business.geo.longitude));
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0;

  const rating =
    reviews.length > 0 && ratingSource
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1),
            reviewCount: reviews.length,
            bestRating: 5,
          },
          review: reviews.map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.author },
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            reviewBody: r.body,
            datePublished: r.date,
          })),
        }
      : {};

  return compact({
    "@type": "ClothingStore",
    "@id": ids.business,
    name: business.name,
    description: business.shortDescription,
    url: SITE_URL,
    logo: business.logo,
    image: business.logo,
    telephone: real(business.phone),
    email: real(business.email),
    priceRange: real(business.priceRange),
    hasMap: real(business.mapUrl),
    address: compact({
      "@type": "PostalAddress",
      streetAddress: real(business.address.street),
      addressLocality: business.address.locality,
      addressRegion: business.address.region,
      postalCode: real(business.address.postalCode),
      addressCountry: business.address.country,
    }),
    geo: hasGeo ? { "@type": "GeoCoordinates", latitude: lat, longitude: lng } : undefined,
    openingHoursSpecification: business.openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    areaServed: cities,
    parentOrganization: { "@id": ids.org },
    sameAs: real([...business.sameAs]),
    knowsAbout: [
      "Bespoke tailoring",
      "Made-to-measure suits",
      "Wedding suits",
      "Image consulting",
      "Executive wardrobe planning",
    ],
    ...rating,
  });
}

export function website(): Json {
  return {
    "@type": "WebSite",
    "@id": ids.website,
    url: SITE_URL,
    name: business.name,
    publisher: { "@id": ids.org },
    inLanguage: "en-US",
  };
}

export function founderPerson(): Json | null {
  if (isPh(founder.name)) return null;
  return {
    "@type": "Person",
    "@id": ids.founder,
    name: founder.name,
    jobTitle: founder.role,
    worksFor: { "@id": ids.org },
    url: abs("/about"),
  };
}

export function service(s: Service): Json {
  const price = real(s.priceFrom);
  return compact({
    "@type": "Service",
    "@id": `${abs(s.path)}#service`,
    name: s.name,
    serviceType: s.serviceType,
    description: s.summary,
    url: abs(s.path),
    provider: { "@id": ids.business },
    areaServed: cities,
    offers: price
      ? {
          "@type": "Offer",
          priceSpecification: { "@type": "PriceSpecification", price, priceCurrency: "USD" },
        }
      : undefined,
  });
}

/** FAQ answers that still contain placeholders are left out of the schema until filled. */
export function faqPage(items: Faq[], path: string): Json | null {
  const ready = items.filter((f) => !isPh(f.a));
  if (!ready.length) return null;
  return {
    "@type": "FAQPage",
    "@id": `${abs(path)}#faq`,
    mainEntity: ready.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: toPlain(f.a) },
    })),
  };
}

export function breadcrumbs(trail: { name: string; path: string }[]): Json {
  const items = [{ name: "Home", path: "/" }, ...trail];
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}

export function article(a: {
  slug: string;
  title: string;
  description: string;
  published: string;
  modified: string;
  section: string;
}): Json {
  const url = abs(`/journal/${a.slug}`);
  const author = founderPerson() ? { "@id": ids.founder } : { "@id": ids.org };
  return {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: a.title,
    description: a.description,
    url,
    mainEntityOfPage: url,
    datePublished: a.published,
    dateModified: a.modified,
    articleSection: a.section,
    inLanguage: "en-US",
    image: abs(`/journal/${a.slug}/opengraph-image`),
    author,
    publisher: { "@id": ids.org },
    isPartOf: { "@id": ids.website },
  };
}

export function webPage(path: string, name: string, description: string): Json {
  return {
    "@type": "WebPage",
    "@id": `${abs(path)}#webpage`,
    url: abs(path),
    name,
    description,
    isPartOf: { "@id": ids.website },
    about: { "@id": ids.business },
    inLanguage: "en-US",
  };
}

export function graph(...nodes: (Json | null)[]): Json {
  return { "@context": "https://schema.org", "@graph": nodes.filter(Boolean) };
}
