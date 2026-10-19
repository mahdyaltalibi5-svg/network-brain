/**
 * Full-page screenshots of every route at 390px and 1440px, plus automatic
 * layout checks (horizontal overflow, images without dimensions, console errors).
 * Usage: node scripts/screenshots.mjs [outDir] [--paths=/,/faq]
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { sitemapPaths, withServer } from "./lib/server.mjs";

const out = process.argv.find((a, i) => i > 1 && !a.startsWith("--")) ?? "screenshots/latest";
const only = process.argv.find((a) => a.startsWith("--paths="))?.slice(8).split(",");
const widths = [390, 1440];
const problems = [];

await withServer(async (base) => {
  const browser = await chromium.launch();
  const paths = only ?? sitemapPaths(base);
  for (const w of widths) {
    mkdirSync(`${out}/${w}`, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    for (const path of paths) {
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + path + (path === "/" ? "?intro=off" : ""), { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const name = path === "/" ? "home" : path.slice(1).replace(/\//g, "__");
      await page.screenshot({ path: `${out}/${w}/${name}.png`, fullPage: true });
      const overflow = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll("body *")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return r.right > vw + 1 && s.position !== "fixed" && !el.closest("[aria-hidden=true]") && !el.closest(".overflow-x-auto") && r.width > 0;
          })
          .slice(0, 3)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
        return { scroll: document.documentElement.scrollWidth > vw, offenders };
      });
      if (overflow.scroll) problems.push(`${w}px ${path}: horizontal scroll (${overflow.offenders.join(", ")})`);
      const noDims = await page.evaluate(() => [...document.images].filter((i) => !i.getAttribute("width") || !i.getAttribute("height")).length);
      if (noDims) problems.push(`${w}px ${path}: ${noDims} <img> without explicit width/height`);
      if (errors.length) problems.push(`${w}px ${path}: console errors: ${errors.join(" | ")}`);
      console.log(`📸 ${w}px ${path}`);
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
});

if (problems.length) {
  console.error(`\n✗ ${problems.length} layout problem(s):\n  ` + problems.join("\n  "));
  process.exit(1);
}
console.log(`\n✓ screenshots in ${out}; no overflow, unsized images or console errors`);
