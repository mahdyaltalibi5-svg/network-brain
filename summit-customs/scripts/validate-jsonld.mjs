/**
 * Parse and validate every JSON-LD block on every route.
 * - must be valid JSON with @context https://schema.org
 * - required properties per @type
 * - every {"@id"} reference must resolve within the page's graphs
 * - no placeholder text published in schema
 * - AggregateRating/Review only when content/reviews.ts has real reviews
 */
import { readFileSync } from "node:fs";
import { curl, sitemapPaths, withServer } from "./lib/server.mjs";

const REQUIRED = {
  Organization: ["name", "url", "logo"],
  ClothingStore: ["name", "url", "address", "areaServed"],
  WebSite: ["url", "name", "publisher"],
  WebPage: ["url", "name", "isPartOf"],
  CollectionPage: ["url", "name"],
  Service: ["name", "serviceType", "provider", "areaServed", "url"],
  FAQPage: ["mainEntity"],
  Question: ["name", "acceptedAnswer"],
  Answer: ["text"],
  BreadcrumbList: ["itemListElement"],
  ListItem: ["position", "name", "item"],
  Article: ["headline", "datePublished", "dateModified", "author", "publisher", "mainEntityOfPage", "image"],
  PostalAddress: ["addressLocality", "addressRegion", "addressCountry"],
  City: ["name"],
  Person: ["name"],
};

const hasReviews = !/export const reviews: ClientReview\[\] = \[\];/.test(readFileSync(new URL("../content/reviews.ts", import.meta.url), "utf8"));
const failures = [];
const warnings = new Set();
const fail = (p, m) => failures.push(`${p}: ${m}`);

function walk(node, visit, path = "$") {
  if (Array.isArray(node)) return node.forEach((n, i) => walk(n, visit, `${path}[${i}]`));
  if (node && typeof node === "object") {
    visit(node, path);
    for (const [k, v] of Object.entries(node)) walk(v, visit, `${path}.${k}`);
  }
}

await withServer(async (base) => {
  const paths = sitemapPaths(base);
  const seenTypes = new Map();
  for (const path of paths) {
    const html = curl(base + path).body;
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    if (!blocks.length) { fail(path, "no JSON-LD"); continue; }

    const docs = [];
    for (const raw of blocks) {
      try { docs.push(JSON.parse(raw)); } catch (e) { fail(path, `invalid JSON: ${e.message}`); }
    }
    const definedIds = new Set();
    const refs = [];
    for (const doc of docs) {
      if (doc["@context"] !== "https://schema.org") fail(path, `bad @context ${doc["@context"]}`);
      walk(doc, (n, at) => {
        if (n["@id"] && n["@type"]) definedIds.add(n["@id"]);
        else if (n["@id"] && Object.keys(n).length === 1) refs.push([n["@id"], at]);
        const type = n["@type"];
        if (!type) return;
        for (const t of [].concat(type)) {
          seenTypes.set(t, (seenTypes.get(t) ?? 0) + 1);
          for (const prop of REQUIRED[t] ?? []) if (n[prop] == null) fail(path, `${t} at ${at} missing "${prop}"`);
          if ((t === "AggregateRating" || t === "Review") && !hasReviews) fail(path, `${t} present but no real reviews`);
        }
        if (n["@type"] === "BreadcrumbList") n.itemListElement.forEach((li, i) => li.position !== i + 1 && fail(path, "breadcrumb positions out of order"));
      });
      const str = JSON.stringify(doc);
      if (str.includes("PLACEHOLDER")) fail(path, "placeholder text published in JSON-LD");
    }
    for (const [id, at] of refs) if (!definedIds.has(id)) fail(path, `dangling @id reference ${id} at ${at}`);

    const types = docs.flatMap((d) => (d["@graph"] ?? [d]).map((n) => n["@type"])).flat();
    if (!types.includes("ClothingStore") || !types.includes("Organization")) fail(path, "sitewide Organization/ClothingStore graph missing");
    if (path.startsWith("/journal/") && !types.includes("Article")) fail(path, "Article missing");
    if (path !== "/" && !types.includes("BreadcrumbList")) fail(path, "BreadcrumbList missing");
    console.log(`✓ ${path.padEnd(52)} ${blocks.length} block(s): ${[...new Set(types)].join(", ")}`);
  }
  // Facts withheld from schema until the client supplies them
  const biz = readFileSync(new URL("../content/business.ts", import.meta.url), "utf8");
  for (const k of ["phone", "email", "street", "postalCode", "latitude", "priceRange"]) if (new RegExp(`${k}: ph\\(`).test(biz)) warnings.add(`ClothingStore.${k} omitted until supplied`);
  if (!seenTypes.get("Service") || seenTypes.get("Service") < 4) fail("site", "expected Service schema on each service page");
  if (!seenTypes.get("FAQPage")) fail("site", "no FAQPage anywhere");
});

for (const w of warnings) console.warn(`⚠ ${w}`);
if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s):\n  ` + failures.join("\n  "));
  process.exit(1);
}
console.log("\n✓ validate-jsonld: all JSON-LD parses and validates");
