import { expect, test, type Page } from "@playwright/test";

async function focusInfo(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
      href: el.getAttribute("href"),
      outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0,
      visible: r.width > 0 && r.height > 0,
    };
  });
}

test("keyboard-only walkthrough of the homepage", async ({ page }) => {
  await page.goto("/?intro=off&tier=high");
  await page.waitForLoadState("networkidle");

  // 1. first Tab reaches the skip link, and it is visible when focused
  await page.keyboard.press("Tab");
  let f = await focusInfo(page);
  expect(f?.text).toBe("Skip to content");
  expect(f?.visible && f.outline).toBeTruthy();

  // 2. tab through the page: every stop is visible with a focus ring
  const seen: string[] = [];
  for (let i = 0; i < 70; i++) {
    await page.keyboard.press("Tab");
    f = await focusInfo(page);
    if (!f) continue;
    expect(f.visible, `focus stop ${i} (${f.text}) not visible`).toBeTruthy();
    expect(f.outline, `focus stop ${i} (${f.text}) has no focus ring`).toBeTruthy();
    seen.push(f.href ?? f.text);
  }
  for (const must of ["/", "/bespoke-suits", "/custom-wedding-suits-salt-lake-city", "/book", "/process", "/fabrics", "/faq"]) {
    expect(seen, `never reached ${must}`).toContain(must);
  }
  expect(seen.some((s) => s.startsWith("How much does a custom suit cost"))).toBeTruthy();

  // 3. FAQ disclosures work from the keyboard
  const summary = page.locator("details.faq summary").nth(1);
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("details.faq").nth(1)).toHaveAttribute("open", "");

  // 4. the skip link moves focus to the main content
  await page.goto("/?intro=off");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("main");
});

test("mobile menu works from the keyboard", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("/bespoke-suits");
  const menu = page.locator("header details summary");
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("header details")).toHaveAttribute("open", "");
  await page.keyboard.press("Tab");
  expect((await focusInfo(page))?.href).toBe("/bespoke-suits");
  await ctx.close();
});

test("route change plays the gold-thread wipe and lands on the new page", async ({ page }) => {
  await page.goto("/bespoke-suits");
  await page.waitForFunction(() => !!document.querySelector(".route-wipe"));
  // motion runtime loads on first engagement: move the pointer, wait for it (the custom cursor marks it ready)
  await page.mouse.move(300, 300);
  await page.mouse.move(320, 310);
  await page.waitForFunction(() => document.documentElement.classList.contains("has-cursor"));
  await page.locator("header nav[aria-label=Primary]").getByRole("link", { name: "Fabrics" }).click();
  await expect(page.locator(".route-wipe")).toBeVisible();
  await expect(page).toHaveURL(/\/fabrics$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cloth chosen");
  await expect(page.locator(".route-wipe")).toBeHidden({ timeout: 3000 });
});

test("no console errors on any route, 3D on", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(`${page.url()}: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
  const res = await page.request.get("/sitemap.xml");
  const paths = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  for (const p of paths) {
    await page.goto(p === "/" ? "/?intro=off&tier=high" : p);
    await page.waitForLoadState("networkidle");
    if (p === "/") {
      await page.waitForFunction(() => document.documentElement.classList.contains("hero-3d"), null, { timeout: 30_000 });
      await page.mouse.wheel(0, 2500);
      await page.waitForTimeout(800);
    }
  }
  expect(errors).toEqual([]);
});

test("static fallbacks render the scroll scenes without WebGL", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator(".intro-canvas")).toHaveCount(0);
  for (const sel of [".process-art", "#anatomy svg[data-static-3d]", "#fabrics [data-static-3d]"]) {
    await page.locator(sel).first().scrollIntoViewIfNeeded();
    await expect(page.locator(sel).first()).toBeVisible();
  }
  await ctx.close();
});
