import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, next = "/portal") {
  await page.goto(next);
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Password").fill("e2e-password");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("everything is private until you sign in", async ({ page, request }) => {
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/login$/);
  expect((await request.get("/portal/api/meta/sync")).status()).toBe(401);
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That password isn't right.")).toBeVisible();
});

test("website lead → pipeline → booked → ordered, with notes", async ({ page, request }) => {
  const res = await request.post("/portal/api/leads", {
    data: { name: "Alex Park", email: "alex@example.com", phone: "801-555-0100", occasion: "Wedding", notes: "Wedding June 14" },
    headers: { origin: "https://summitcustomsuits.com" },
  });
  expect(res.status()).toBe(201);

  await signIn(page);
  await expect(page).toHaveURL(/\/portal$/);
  const newCol = page.locator('[data-stage="new"]');
  await expect(newCol.getByRole("link", { name: "Alex Park" })).toBeVisible();

  // move to booked straight from the board
  await newCol.locator("li", { hasText: "Alex Park" }).getByLabel("Stage").selectOption("booked");
  await expect(page.locator('[data-stage="booked"]').getByRole("link", { name: "Alex Park" })).toBeVisible();

  // open the lead, add a note, record the order
  await page.locator('[data-stage="booked"]').getByRole("link", { name: "Alex Park" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Alex Park" })).toBeVisible();
  await expect(page.getByText("Wedding June 14")).toBeVisible();
  await page.getByLabel("Add a note").fill("Called. Coming in Saturday 11am.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Called. Coming in Saturday 11am.")).toBeVisible();

  page.once("dialog", (d) => d.accept("2,850"));
  await page.getByLabel("Stage").selectOption("ordered");
  await expect(page.getByText("Order value $2,850")).toBeVisible();
  await expect(page.getByText("Consultation booked → Order placed")).toBeVisible();
  // without Meta credentials the event is logged as not sent, never silently dropped
  await expect(page.getByText(/“Purchase” not sent to Meta: Conversions API not configured/)).toBeVisible();
});

test("add a lead by hand, search for it", async ({ page }) => {
  await signIn(page);
  await page.getByText("+ New lead").click();
  await page.getByLabel("Name").fill("Morgan Hale");
  await page.getByLabel("Phone").fill("(801) 555-0123");
  await page.getByLabel("What for").fill("Executive wardrobe");
  await page.getByRole("button", { name: "Add lead" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Morgan Hale" })).toBeVisible();
  await page.getByRole("link", { name: "← Pipeline" }).click();
  await page.getByLabel("Search leads").fill("Hale");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByText(/1 match for “Hale”/)).toBeVisible();
});

test("ads and settings pages explain what to connect", async ({ page }) => {
  await signIn(page, "/portal/settings");
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { level: 1, name: "Connections" })).toBeVisible();
  await expect(page.getByText("/api/meta/webhook")).toBeVisible();
  await expect(page.locator("li", { hasText: "Conversions API" }).getByText("Not set up")).toBeVisible();
  await page.getByRole("link", { name: "Meta ads" }).click();
  await expect(page.getByText(/Ad spend isn.t connected yet/)).toBeVisible();
  await page.getByRole("link", { name: "Last 7 days" }).click();
  await expect(page).toHaveURL(/range=last_7d/);
});

test("import the lead file downloaded from Meta", async ({ page }) => {
  await signIn(page, "/portal/settings");
  const csv = "id,created_time,campaign_id,campaign_name,full_name,phone_number\n120299988877766,2026-11-02T10:00:00+0000,c:9,Kobe.Ascend - LEADS,Jamie Cole,p:+18015550142\n";
  const file = { name: "leads.csv", mimeType: "text/csv", buffer: Buffer.from(csv) };
  await page.getByLabel("Meta lead file").setInputFiles(file);
  await page.getByRole("button", { name: "Import leads" }).click();
  await expect(page.getByText("Imported 1 new lead.")).toBeVisible();
  await page.getByLabel("Meta lead file").setInputFiles(file);
  await page.getByRole("button", { name: "Import leads" }).click();
  await expect(page.getByText("Imported 0 new leads; 1 already in the CRM.")).toBeVisible();
  await page.getByRole("link", { name: "Pipeline" }).click();
  await page.getByRole("link", { name: "Jamie Cole" }).click();
  await expect(page.getByText("Kobe.Ascend - LEADS")).toBeVisible();
});

test("speed to lead: a new lead waits on Respond until it's called", async ({ page, request }) => {
  const res = await request.post("/portal/api/leads", {
    data: { name: "Riley Fast", phone: "801-555-0199", occasion: "Tuxedo" },
    headers: { origin: "https://summitcustomsuits.com" },
  });
  expect(res.status()).toBe(201);
  await signIn(page, "/portal/now");
  await expect(page).toHaveURL(/\/now$/);
  const card = page.locator('[data-testid="waiting"] li', { hasText: "Riley Fast" });
  await expect(card).toBeVisible();
  await expect(card.locator(".font-mono")).toHaveText(/^\d+:\d{2}$/); // live clock
  await expect(page.getByRole("link", { name: /Respond/ }).locator("span")).toHaveText(/\d+/); // badge

  // keep the browser from leaving for the dialer; the click handler still logs the call
  await page.evaluate(() => document.addEventListener("click", (e) => { if ((e.target as Element).closest('a[href^="tel:"],a[href^="sms:"]')) e.preventDefault(); }, true));
  const beacon = page.waitForRequest((r) => r.url().includes("/touch") && r.method() === "POST");
  await card.getByRole("link", { name: "Call" }).click();
  await beacon;
  await expect.poll(async () => (await page.reload(), await page.locator('[data-testid="waiting"] li', { hasText: "Riley Fast" }).count())).toBe(0);
  await expect(page.getByTestId("speed")).toContainText("Leads answered (30 days)");

  await page.goto("/portal");
  await page.getByRole("link", { name: "Riley Fast" }).click();
  await expect(page.getByTestId("response")).toHaveText(/First response in/);
  await expect(page.getByText(/Called 801-555-0199 · first response in/)).toBeVisible();

  await page.getByText("Delete this lead").click();
  await page.getByRole("button", { name: "Yes, delete it" }).click();
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole("link", { name: "Riley Fast" })).toHaveCount(0);
});

test("website tab explains how to connect, and the app is installable", async ({ page, request }) => {
  await signIn(page, "/portal/website");
  await expect(page.getByRole("heading", { level: 1, name: "summitcustomsuits.com" })).toBeVisible();
  await expect(page.getByText("Connect website editing")).toBeVisible();
  const m = await (await request.get("/portal/manifest.webmanifest")).json();
  expect(m).toMatchObject({ name: "Summit CRM", start_url: "/portal/now", scope: "/portal/", display: "standalone" });
  expect((await request.get("/portal/sw.js")).status()).toBe(200);
  expect((await request.get("/portal/icons/icon-192.png")).status()).toBe(200);
});
