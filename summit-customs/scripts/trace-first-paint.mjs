/**
 * Diagnostic: traces what the main thread does before first contentful paint on a page.
 * Usage: node scripts/trace-first-paint.mjs /bespoke-suits [runs]
 */
import { chromium } from "@playwright/test";
import { withServer } from "./lib/server.mjs";
const path = process.argv[2] ?? "/";
const runs = Number(process.argv[3] ?? 3);
await withServer(async (base) => {
  const b = await chromium.launch();
  for (let run = 0; run < runs; run++) {
    const p = await b.newPage({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
    const cdp = await p.context().newCDPSession(p);
    const events = [];
    cdp.on("Tracing.dataCollected", (e) => events.push(...e.value));
    const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
    await cdp.send("Tracing.start", { categories: "devtools.timeline,loading,disabled-by-default-devtools.timeline", transferMode: "ReportEvents" });
    await p.goto(base + path, { waitUntil: "load" });
    await p.waitForTimeout(400);
    await cdp.send("Tracing.end");
    await done;
    const fcp = events.find((e) => e.name === "firstContentfulPaint");
    const t0 = events.find((e) => e.name === "ResourceSendRequest" && new URL(e.args?.data?.url ?? "http://x/").pathname === path)?.ts;
    const rel = (ts) => ((ts - t0) / 1000).toFixed(1);
    const rows = events
      .filter((e) => ["ParseHTML", "EvaluateScript", "UpdateLayoutTree", "Layout", "Paint", "Commit"].includes(e.name) && e.ph === "X" && e.dur > 1500 && e.ts < fcp.ts + 20000)
      .map((e) => `${rel(e.ts)} ${e.name} ${(e.dur / 1000).toFixed(1)}ms ${(e.args?.data?.url ?? "").split("/").pop().slice(0, 20)}`);
    console.log(`run ${run}: FCP ${rel(fcp.ts)}ms | ${rows.join(" | ")}`);
    await p.close();
  }
  await b.close();
});
