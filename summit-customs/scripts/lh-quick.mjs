/** One-off Lighthouse runs (mobile) for quick experiments: node scripts/lh-quick.mjs /faq [runs] */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { withServer } from "./lib/server.mjs";
const path = process.argv[2] ?? "/";
const runs = Number(process.argv[3] ?? 1);
await withServer(async (base) => {
  for (let i = 0; i < runs; i++) {
    execFileSync("npx", ["lighthouse", base + path, "--quiet", "--output=json", "--output-path=/tmp/lhq.json", "--chrome-flags=--no-sandbox --headless=new", "--only-categories=performance", ...(process.env.LH_METHOD ? [`--throttling-method=${process.env.LH_METHOD}`] : [])], {
      env: { ...process.env, CHROME_PATH: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" },
      stdio: "ignore",
    });
    const r = JSON.parse(readFileSync("/tmp/lhq.json", "utf8"));
    const a = (k) => Math.round(r.audits[k].numericValue);
    const el = r.audits["largest-contentful-paint-element"].details.items[0].items[0].node.snippet.slice(0, 60);
    console.log(path, "perf", Math.round(r.categories.performance.score * 100), "FCP", a("first-contentful-paint"), "LCP", a("largest-contentful-paint"), "TBT", a("total-blocking-time"), "SI", a("speed-index"), "CLS", r.audits["cumulative-layout-shift"].numericValue.toFixed(3), el);
    if (process.argv.includes("--shifts")) console.log(JSON.stringify(r.audits["layout-shifts"]?.details?.items?.slice(0, 4).map((i) => [i.score?.toFixed(3), i.node?.snippet?.slice(0, 160), i.node?.selector]), null, 1));
  }
});
