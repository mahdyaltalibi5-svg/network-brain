/** Summarises .lighthouseci reports: median per URL of scores and Core Web Vitals (lab). */
import { readdirSync, readFileSync } from "node:fs";

const dir = ".lighthouseci";
const runs = readdirSync(dir).filter((f) => f.startsWith("lhr-") && f.endsWith(".json")).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
const byUrl = new Map();
for (const r of runs) {
  const u = new URL(r.finalDisplayedUrl ?? r.finalUrl).pathname;
  if (!byUrl.has(u)) byUrl.set(u, []);
  byUrl.get(u).push(r);
}
const med = (xs) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const rows = [];
for (const [u, rs] of byUrl) {
  const c = (k) => Math.round(med(rs.map((r) => r.categories[k].score * 100)));
  const a = (k) => med(rs.map((r) => r.audits[k].numericValue));
  rows.push({
    url: u,
    performance: c("performance"),
    accessibility: c("accessibility"),
    bestPractices: c("best-practices"),
    seo: c("seo"),
    lcp_ms: Math.round(a("largest-contentful-paint")),
    cls: +a("cumulative-layout-shift").toFixed(3),
    tbt_ms: Math.round(a("total-blocking-time")),
    fcp_ms: Math.round(a("first-contentful-paint")),
    si_ms: Math.round(a("speed-index")),
  });
}
console.table(rows);
if (process.argv.includes("--md")) {
  console.log("| URL | Perf | A11y | Best Pr. | SEO | LCP | CLS | TBT |\n|---|---|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.url} | ${r.performance} | ${r.accessibility} | ${r.bestPractices} | ${r.seo} | ${(r.lcp_ms / 1000).toFixed(2)} s | ${r.cls} | ${r.tbt_ms} ms |`);
}
