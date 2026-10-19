/**
 * Plays the full intro in headless Chromium at a given tier and reports frame rate
 * from requestAnimationFrame deltas recorded by the render loop.
 * Usage: node scripts/fps.mjs [--tier=mid] [--w=1440] [--h=900]
 * Note: headless Chromium here renders WebGL in software (SwiftShader), so this is a floor, not a real-GPU figure.
 */
import { chromium } from "@playwright/test";
import { withServer } from "./lib/server.mjs";

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const tier = arg("tier", "mid");
const W = Number(arg("w", 1440));
const H = Number(arg("h", 900));
const args = arg("gpu", "swiftshader") === "swiftshader"
  ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
  : ["--ignore-gpu-blocklist", "--enable-gpu"];

await withServer(async (base) => {
  const browser = await chromium.launch({ args });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(`${base}/?intro=force&tier=${tier}`);
  await page.waitForFunction(() => document.documentElement.classList.contains("intro-active"), null, { timeout: 60_000 });
  const t0 = Date.now();
  await page.waitForFunction(() => document.documentElement.classList.contains("intro-done"), null, { timeout: 120_000 });
  const wall = (Date.now() - t0) / 1000;
  const { dts, cpu, renderer } = await page.evaluate(() => {
    const gl = document.querySelector("canvas")?.getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return { dts: [...window.__intro.fps], cpu: [...window.__intro.cpu], renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown" };
  });
  const fps = dts.slice(5).map((d) => 1 / d).sort((a, b) => a - b);
  const avg = fps.length / dts.slice(5).reduce((a, b) => a + b, 0);
  const p5 = fps[Math.floor(fps.length * 0.05)];
  const c = cpu.slice(5).sort((a, b) => a - b);
  const cpuMedian = c[Math.floor(c.length / 2)];
  const cpuP95 = c[Math.floor(c.length * 0.95)];
  console.log(JSON.stringify({ tier, viewport: `${W}x${H}`, renderer, frames: fps.length, introWallSeconds: wall, avgFps: +avg.toFixed(1), p5Fps: +p5.toFixed(1), mainThreadMsPerFrame: { median: +cpuMedian.toFixed(2), p95: +cpuP95.toFixed(2), budgetAt60fps: 16.7 } }, null, 1));
  await browser.close();
});
