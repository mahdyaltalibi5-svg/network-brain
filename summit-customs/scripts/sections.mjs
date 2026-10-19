/**
 * Screenshots every homepage section at 390 px and 1440 px with the 3D layer running
 * (?intro=off&tier=…), including three steps of the pinned process scene on desktop.
 * Usage: node scripts/sections.mjs [outDir] [--tier=high] [--static]   (--static = reduced motion)
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { withServer } from "./lib/server.mjs";

const out = process.argv.find((a, i) => i > 1 && !a.startsWith("--")) ?? "screenshots/sections";
const tier = process.argv.find((a) => a.startsWith("--tier="))?.slice(7) ?? "high";
const isStatic = process.argv.includes("--static");
const GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const errors = [];

await withServer(async (base) => {
  const browser = await chromium.launch({ args: GL });
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    mkdirSync(`${out}/${w}`, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: isStatic ? "reduce" : "no-preference", hasTouch: w < 600, isMobile: w < 600 });
    const page = await ctx.newPage();
    page.on("console", (m) => m.type() === "error" && errors.push(`${w}: ${m.text()}`));
    page.on("pageerror", (e) => errors.push(`${w}: ${e.message}`));
    await page.goto(`${base}/?intro=off&tier=${tier}`, { waitUntil: "load" });
    if (!isStatic) await page.waitForFunction(() => document.documentElement.classList.contains("hero-3d") && window.__intro?.fps.length > 10, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const shots = [["hero", 0]];
    for (const id of ["process", "anatomy", "fabrics", "image-consulting", "occasions", "testimonials", "faq", "cta-title"]) shots.push([id, null]);
    for (const [id] of shots) {
      const y = await page.evaluate((id) => {
        const el = id === "cta-title" ? document.getElementById(id)?.closest("section") : document.getElementById(id);
        return el ? el.getBoundingClientRect().top + window.scrollY : 0;
      }, id);
      const stops = id === "process" && w >= 1024 ? [["process-intro", y], ["process-camp1", null, 0], ["process-camp3", null, 0.5], ["process-camp5", null, 1]] : [[id, y]];
      for (const [name, yy, prog] of stops) {
        const target = prog == null
          ? yy
          : await page.evaluate((p) => {
              const stage = document.querySelector("[data-process-stage]");
              const spacer = stage.parentElement.classList.contains("pin-spacer") ? stage.parentElement : stage;
              const top = spacer.getBoundingClientRect().top + window.scrollY;
              return top + p * window.innerHeight * 2.2 + 2;
            }, prog);
        await page.evaluate((y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y)), target);
        await page.waitForTimeout(isStatic ? 300 : 2600);
        await page.screenshot({ path: `${out}/${w}/${name}.png` });
        console.log(`📸 ${w} ${name}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
});
if (errors.length) {
  console.error("console errors:\n  " + [...new Set(errors)].join("\n  "));
  process.exit(1);
}
