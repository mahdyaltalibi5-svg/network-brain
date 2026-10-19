import { expect, test, type Page } from "@playwright/test";

const done = (page: Page) => page.waitForFunction(() => document.documentElement.classList.contains("intro-done"));
const veilHidden = async (page: Page) =>
  expect(page.locator(".intro-ui")).toHaveCSS("visibility", "hidden", { timeout: 5000 });

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test("first visit plays the full intro and the Skip button ends it quickly", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/?intro=force&tier=high");
  await expect(page.locator("html")).toHaveAttribute("data-intro", "full");
  // Skip is visible from the first frame, before WebGL is ready
  await expect(page.getByRole("button", { name: "Skip intro" })).toBeVisible();
  await page.waitForFunction(() => document.documentElement.classList.contains("intro-active"), null, { timeout: 30_000 });
  const t0 = Date.now();
  await page.getByRole("button", { name: "Skip intro" }).click();
  await done(page);
  expect(Date.now() - t0).toBeLessThan(2500);
  await veilHidden(page);
  await expect(page.locator(".intro-canvas")).toHaveAttribute("data-layer", "page");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("sc-intro"))).toBe("1");
  expect(errors).toEqual([]);
});

test("Skip is keyboard reachable: first Tab focuses it, Enter skips; Escape also skips", async ({ page }) => {
  await page.goto("/?intro=force&tier=high");
  await page.waitForFunction(() => document.documentElement.classList.contains("intro-active"), null, { timeout: 30_000 });
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Skip intro" })).toBeFocused();
  await page.keyboard.press("Enter");
  await done(page);
  // focus is returned to the page, not left on the hidden overlay
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("main");

  await page.evaluate(() => sessionStorage.clear());
  await page.goto("/?intro=force&tier=high");
  await page.waitForFunction(() => document.documentElement.classList.contains("intro-active"), null, { timeout: 30_000 });
  await page.keyboard.press("Escape");
  await done(page);
});

test("return visit in the same session gets the 1.5 s micro-version", async ({ page }) => {
  await page.goto("/?tier=high");
  await expect(page.locator("html")).toHaveAttribute("data-intro", "full");
  await page.getByRole("button", { name: "Skip intro" }).click();
  await done(page);
  await page.goto("/?tier=high");
  await expect(page.locator("html")).toHaveAttribute("data-intro", "micro");
  await page.waitForFunction(() => document.documentElement.classList.contains("intro-active"), null, { timeout: 30_000 });
  const t0 = Date.now();
  await done(page);
  // 1.5 s timeline; allow for slow software rendering
  expect(Date.now() - t0).toBeLessThan(4000);
});

test("reduced motion gets the 3 s SVG fallback and never loads WebGL", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/intro-fallback/);
  await expect(page.locator(".intro-fallback-art")).toBeVisible();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: "screenshots/intro/fallback-1440-t1_6.png" });
  await done(page);
  await expect(page.locator(".intro-canvas")).toHaveCount(0);
  // second visit: no intro at all
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/intro-on/);
  expect(errors).toEqual([]);
  await ctx.close();
});

test("low GPU tier falls back to the SVG version", async ({ page }) => {
  await page.goto("/?intro=force&tier=low");
  await expect(page.locator("html")).toHaveClass(/intro-fallback/, { timeout: 10_000 });
  await done(page);
  await expect(page.locator(".intro-canvas")).toHaveCount(0);
});

test("?intro=off and inner pages never show the overlay", async ({ page }) => {
  await page.goto("/?intro=off&tier=high");
  await expect(page.locator("html")).not.toHaveClass(/intro-on/);
  await expect(page.locator(".intro-ui")).toBeHidden();
  await page.goto("/bespoke-suits");
  await expect(page.locator("html")).not.toHaveClass(/intro-on/);
});

test("intro plays through to the resting hero on its own", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/?intro=force&tier=mid");
  await page.waitForFunction(() => document.documentElement.classList.contains("intro-active"), null, { timeout: 30_000 });
  await done(page);
  await expect(page.locator("html")).toHaveClass(/hero-3d/);
  await expect(page.locator(".intro-canvas")).toHaveAttribute("data-layer", "page");
  expect(errors).toEqual([]);
});
