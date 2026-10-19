/**
 * Captures intro frames deterministically: ?t=<s> pauses the master timeline at that time.
 * Usage: node scripts/intro-frames.mjs [outDir] [--tier=high|mid] [--w=1440] [--h=900] [--times=0.5,2]
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { withServer } from "./lib/server.mjs";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const out = process.argv.find((a, i) => i > 1 && !a.startsWith("--")) ?? "screenshots/intro";
const tier = arg("tier", "high");
const W = Number(arg("w", 1440));
const H = Number(arg("h", 900));
const times = arg("times", "0.5,2,3.5,5,6.5,7.8,10").split(",").map(Number);
export const GL_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

mkdirSync(out, { recursive: true });
const errors = [];
await withServer(async (base) => {
  const browser = await chromium.launch({ args: GL_ARGS });
  for (const t of times) {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    page.on("console", (m) => m.type() === "error" && errors.push(`t=${t}: ${m.text()}`));
    page.on("pageerror", (e) => errors.push(`t=${t}: ${e.message}`));
    await page.goto(`${base}/?intro=force&tier=${tier}&t=${t}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__intro && window.__intro.fps.length > 12, null, { timeout: 60000 });
    await page.waitForTimeout(400);
    const file = `${out}/${tier}-${W}-t${String(t).replace(".", "_")}.png`;
    await page.screenshot({ path: file });
    console.log(`🎞  t=${t}s → ${file}`);
    await page.close();
  }
  await browser.close();
});
if (errors.length) {
  console.error("console errors:\n  " + [...new Set(errors)].join("\n  "));
  process.exit(1);
}
