/**
 * Phase-1 crawler check: curl every route WITHOUT JavaScript and assert the
 * content a search engine or AI crawler needs is in the raw HTML.
 * Writes a text snapshot to scripts/.snapshots/ so later phases can diff it.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { curl, sitemapPaths, withServer } from "./lib/server.mjs";

const NAV = ["/bespoke-suits", "/custom-wedding-suits-salt-lake-city", "/image-consulting", "/executive-wardrobe", "/fabrics", "/process", "/journal", "/about", "/faq", "/contact", "/book"];
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "PerplexityBot", "ClaudeBot", "Google-Extended"];
const SNAP = new URL("./.snapshots/html-text.json", import.meta.url);
const compare = process.argv.includes("--compare");

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&[lr]dquo;/g, '"');
const text = (html) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();

const failures = [];
const fail = (path, msg) => failures.push(`${path}: ${msg}`);

await withServer(async (base) => {
  const paths = sitemapPaths(base);
  if (paths.length < 15) fail("sitemap", `only ${paths.length} URLs`);
  const titles = new Map();
  const descs = new Map();
  const snapshot = {};

  for (const path of paths) {
    const { status, body: html } = curl(base + path);
    if (status !== 200) { fail(path, `HTTP ${status}`); continue; }

    const h1s = [...html.matchAll(/<h1[\s>][\s\S]*?<\/h1>/g)];
    if (h1s.length !== 1) fail(path, `expected exactly 1 <h1>, found ${h1s.length}`);

    const main = html.match(/<main[\s\S]*<\/main>/)?.[0] ?? "";
    const words = text(main).split(" ").length;
    const min = ["/book", "/contact", "/journal"].includes(path) ? 150 : 300;
    if (words < min) fail(path, `only ${words} words of body copy in <main> (min ${min})`);
    if (path.startsWith("/journal/")) {
      const body = html.match(/data-article-body[^>]*>([\s\S]*?)<\/article>/)?.[1] ?? "";
      const n = text(body).split(" ").length;
      if (n < 1100) fail(path, `article body only ${n} words (min 1100)`);
    }

    for (const href of NAV) if (!html.includes(`href="${href}"`)) fail(path, `missing nav link ${href}`);

    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
    const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    if (!title) fail(path, "missing <title>");
    if (!desc) fail(path, "missing meta description");
    if (desc && (desc.length < 70 || desc.length > 175)) fail(path, `meta description length ${desc.length}`);
    const expected = new URL(path, "https://summitcustomsuits.com").toString().replace(/\/$/, "");
    if (canonical?.replace(/\/$/, "") !== expected) fail(path, `bad canonical ${canonical}`);
    for (const p of ["og:title", "og:description", "og:url", "og:type"]) if (!html.includes(`property="${p}"`)) fail(path, `missing ${p}`);
    if (!html.includes('name="twitter:card"')) fail(path, "missing twitter:card");
    const ogImage = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1];
    if (!ogImage?.startsWith("https://summitcustomsuits.com/")) fail(path, `og:image missing or not absolute: ${ogImage}`);
    else {
      const img = new URL(ogImage);
      const head = execFileSync("curl", ["-sS", "-o", "/dev/null", "-w", "%{http_code} %{content_type}", base + img.pathname + img.search]).toString();
      if (head !== "200 image/png") fail(path, `og:image ${img.pathname} → ${head}`);
    }
    if (!/<script type="application\/ld\+json">/.test(html)) fail(path, "missing JSON-LD");
    if (titles.has(title)) fail(path, `duplicate title with ${titles.get(title)}`); else titles.set(title, path);
    if (descs.has(desc)) fail(path, `duplicate description with ${descs.get(desc)}`); else descs.set(desc, path);

    // Content must not be hidden behind client rendering
    if (/BAILOUT_TO_CLIENT_SIDE_RENDERING/.test(html)) fail(path, "client-side rendering bailout");
    const h1Text = h1s[0] ? text(h1s[0][0]) : "";
    const summary = html.match(/<p data-summary[^>]*>([\s\S]*?)<\/p>/)?.[1];
    snapshot[path] = { title, desc, h1: h1Text, words, summary: summary ? text(summary) : null, text: text(main) };
    console.log(`✓ ${path.padEnd(52)} h1="${h1Text.slice(0, 48)}" words=${words}`);
  }

  // robots.txt + llms.txt
  const robots = curl(base + "/robots.txt").body;
  for (const bot of AI_BOTS) if (!new RegExp(`User-Agent: ${bot}\\nAllow: /`, "i").test(robots)) fail("/robots.txt", `${bot} not explicitly allowed`);
  if (!robots.includes("Sitemap: https://summitcustomsuits.com/sitemap.xml")) fail("/robots.txt", "no sitemap line");
  for (const f of ["/llms.txt", "/llms-full.txt"]) {
    const r = curl(base + f);
    if (r.status !== 200 || r.body.length < 800) fail(f, `status ${r.status}, ${r.body.length} bytes`);
  }
  const nf = curl(base + "/journal/does-not-exist");
  if (nf.status !== 404) fail("/journal/does-not-exist", `expected 404, got ${nf.status}`);

  mkdirSync(new URL("./.snapshots/", import.meta.url), { recursive: true });
  if (compare) {
    if (!existsSync(SNAP)) fail("snapshot", "no baseline snapshot to compare against");
    else {
      const before = JSON.parse(readFileSync(SNAP, "utf8"));
      for (const [p, snap] of Object.entries(before)) {
        const now = snapshot[p];
        if (!now) { fail(p, "route disappeared"); continue; }
        for (const k of ["title", "desc", "h1", "summary"]) if (snap[k] !== now[k]) fail(p, `${k} changed since baseline`);
        if (now.words < snap.words) fail(p, `body copy shrank ${snap.words} → ${now.words} words`);
        // every sentence of the baseline copy must still be in the raw HTML
        const missing = snap.text.split(/(?<=[.?!])\s+/).filter((sent) => sent.length > 20 && !now.text.includes(sent));
        if (missing.length) fail(p, `${missing.length} baseline sentence(s) missing, e.g. "${missing[0].slice(0, 80)}"`);
      }
      console.log("compared against Phase 1 baseline: titles, descriptions, H1s, summaries and every body sentence intact");
    }
  } else {
    writeFileSync(SNAP, JSON.stringify(snapshot, null, 1));
  }
});

if (failures.length) {
  console.error(`\n✗ ${failures.length} failure(s):\n  ` + failures.join("\n  "));
  process.exit(1);
}
console.log("\n✓ verify-html: all routes serve complete content without JavaScript");
