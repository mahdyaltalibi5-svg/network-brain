import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** WCAG 2.2 A/AA automated audit (axe-core) on every route in the sitemap. */
test("axe: no WCAG 2.2 AA violations on any route", async ({ page }) => {
  const res = await page.request.get("/sitemap.xml");
  const paths = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const report: string[] = [];
  for (const p of paths) {
    await page.goto(p === "/" ? "/?intro=off" : p);
    await page.waitForLoadState("networkidle");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    for (const v of r.violations) report.push(`${p} · ${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(" ")}`);
  }
  expect(report, report.join("\n")).toEqual([]);
});
