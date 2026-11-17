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

  await signIn(page, "/portal/pipeline");
  await expect(page).toHaveURL(/\/portal\/pipeline$/);
  const newCol = page.locator('[data-stage="new"]');
  await expect(newCol.getByRole("link", { name: "Alex Park" })).toBeVisible();

  // drag the card by its handle into "Consultation booked"
  const handle = newCol.getByRole("button", { name: "Move Alex Park" });
  const target = page.locator('[data-stage="booked"]');
  const h = (await handle.boundingBox())!;
  const t = (await target.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + 30, h.y + 10, { steps: 5 });
  await page.mouse.move(t.x + t.width / 2, t.y + 120, { steps: 12 });
  await page.mouse.up();
  await expect(target.getByRole("link", { name: "Alex Park" })).toBeVisible();
  await expect.poll(async () => (await page.reload(), await page.locator('[data-stage="booked"]').getByRole("link", { name: "Alex Park" }).count())).toBe(1);

  // open the lead, add a note, record the order
  await page.locator('[data-stage="booked"]').getByRole("link", { name: "Alex Park" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Alex Park" })).toBeVisible();
  await expect(page.getByText("Wedding June 14")).toBeVisible();
  await page.getByLabel("Add a note").fill("Called. Coming in Saturday 11am.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Called. Coming in Saturday 11am.")).toBeVisible();

  page.once("dialog", (d) => d.accept("2,850"));
  await page.getByLabel("Stage").selectOption("ordered");
  await expect(page.getByText("Order value set to $2,850.00")).toBeVisible();
  await expect(page.getByLabel("Deal value (USD)")).toHaveValue("2850");
  await expect(page.getByText("Consultation booked → Order placed")).toBeVisible();
  // without Meta credentials the event is logged as not sent, never silently dropped
  await expect(page.getByText(/“Purchase” not sent to Meta: Conversions API not configured/)).toBeVisible();
});

test("add a lead by hand, search for it", async ({ page }) => {
  await signIn(page, "/portal/pipeline");
  await page.locator("summary", { hasText: "New lead" }).click();
  await page.getByLabel("Name").fill("Morgan Hale");
  await page.getByLabel("Phone").fill("(801) 555-0123");
  await page.getByLabel("What for").fill("Executive wardrobe");
  await page.getByRole("button", { name: "Add lead" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Morgan Hale" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Pipeline", exact: true }).click();
  await page.getByLabel("Search leads").fill("Hale");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("1 lead matches.")).toBeVisible();
  await page.getByRole("link", { name: "List" }).click();
  await expect(page.getByRole("row", { name: /Morgan Hale/ })).toBeVisible();
});

test("ads and settings pages explain what to connect", async ({ page }) => {
  await signIn(page, "/portal/settings");
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { level: 1, name: "Connections" })).toBeVisible();
  await expect(page.getByText("/api/meta/webhook")).toBeVisible();
  const meta = page.getByTestId("meta-connect");
  await expect(meta.getByText("Not connected")).toBeVisible();
  await expect(meta.getByText("https://www.summitcustomsuits.com/portal/api/meta/callback")).toBeVisible();
  await expect(meta.getByRole("link", { name: "Connect with Facebook" })).toHaveCount(0); // needs the app first
  await meta.getByLabel("App ID").fill("123");
  await meta.getByLabel("App secret").fill("short");
  await meta.getByRole("button", { name: "Save app" }).click();
  await expect(meta.getByRole("alert")).toContainText("App ID is a long number");
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
  await page.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name: "Pipeline" }).click();
  await page.getByRole("link", { name: "Jamie Cole" }).click();
  await expect(page.getByRole("region", { name: "Where they came from" }).getByText("Kobe.Ascend - LEADS")).toBeVisible();
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
  await expect(page.getByRole("link", { name: /Today/ }).first().locator("span")).toHaveText(/\d+/); // badge

  // keep the browser from leaving for the dialer; the click handler still logs the call
  await page.evaluate(() => document.addEventListener("click", (e) => { if ((e.target as Element).closest('a[href^="tel:"],a[href^="sms:"]')) e.preventDefault(); }, true));
  const beacon = page.waitForRequest((r) => r.url().includes("/touch") && r.method() === "POST");
  await card.getByRole("link", { name: "Call" }).click();
  await beacon;
  await expect.poll(async () => (await page.reload(), await page.locator('[data-testid="waiting"] li', { hasText: "Riley Fast" }).count())).toBe(0);
  await expect(page.getByTestId("speed")).toContainText("Leads answered (30 days)");

  await page.goto("/portal/pipeline");
  await page.getByRole("link", { name: "Riley Fast" }).click();
  await expect(page.getByTestId("response")).toHaveText(/First response in/);
  await expect(page.getByText(/Called 801-555-0199 · first response in/)).toBeVisible();

  await page.getByText("Delete this lead").click();
  await page.getByRole("button", { name: "Yes, delete it" }).click();
  await expect(page).toHaveURL(/\/portal\/pipeline$/);
  await expect(page.getByRole("link", { name: "Riley Fast" })).toHaveCount(0);
});

test("website tab explains how to connect, and the app is installable", async ({ page, request }) => {
  await signIn(page, "/portal/website");
  await expect(page.getByRole("heading", { level: 1, name: "summitcustomsuits.com" })).toBeVisible();
  const setup = page.getByTestId("agent-setup");
  await expect(setup.getByLabel("Claude API key")).toBeVisible();
  await expect(setup.getByLabel("GitHub token")).toBeVisible();
  await setup.getByLabel("Claude API key").fill("not-a-key");
  await setup.locator("form", { has: page.getByLabel("Claude API key") }).getByRole("button", { name: "Save" }).click();
  await expect(setup.getByRole("alert")).toContainText("doesn't look like a Claude API key");
  expect((await request.post("/portal/api/agent", { data: { message: "x" } })).status()).toBe(401); // signed-in only
  const m = await (await request.get("/portal/manifest.webmanifest")).json();
  expect(m).toMatchObject({ name: "Summit CRM", start_url: "/portal/now", scope: "/portal/", display: "standalone" });
  expect((await request.get("/portal/sw.js")).status()).toBe(200);
  expect((await request.get("/portal/icons/icon-192.png")).status()).toBe(200);
});

test("dashboard home shows the numbers, with a table view of each chart", async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Good (morning|afternoon|evening), Kobe/);
  await expect(page.getByTestId("kpis")).toContainText("New leads");
  await expect(page.getByRole("heading", { name: "Leads per day" })).toBeVisible();
  await page.getByText("Table view").first().click();
  await expect(page.getByRole("table").first()).toBeVisible();
});

test("client profile: follow-up, measurements, garments and files", async ({ page, request }) => {
  await request.post("/portal/api/leads", {
    data: { name: "Taylor Quinn", phone: "801-555-0177", occasion: "Wedding" },
    headers: { origin: "https://summitcustomsuits.com" },
  });
  await signIn(page, "/portal/pipeline");
  await page.getByRole("link", { name: "Taylor Quinn" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Taylor Quinn" })).toBeVisible();

  // follow-up → shows on Today
  await page.getByRole("button", { name: "Tomorrow 10am" }).click();
  await page.getByLabel("What to do").fill("Send swatches");
  await page.getByRole("button", { name: "Set follow-up" }).click();
  await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
  await expect(page.getByText(/Follow-up set for/)).toBeVisible();

  // event + value
  await page.getByLabel("Event", { exact: true }).fill("Wedding");
  await page.getByLabel("Date").fill("2027-06-14");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Event: Wedding/)).toBeVisible();

  const tabs = page.getByRole("navigation", { name: "Client sections" });
  await tabs.getByRole("link", { name: /Measurements/ }).click();
  await page.getByLabel("Chest").fill("40.5");
  await page.getByLabel("Inseam").fill("32");
  await page.getByRole("button", { name: "Save measurements" }).click();
  await expect(tabs.getByRole("link", { name: /Measurements/ })).toContainText("2");

  await tabs.getByRole("link", { name: /Garments/ }).click();
  await page.getByLabel("Garment").selectOption("Two-piece suit");
  await page.getByLabel("Cloth").fill("Navy Super 130s");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  const g = page.getByTestId("garments").locator("li", { hasText: "Two-piece suit" });
  await expect(g).toContainText("Navy Super 130s");
  await g.getByRole("button", { name: "Fitting" }).click();
  await expect(g.getByRole("button", { name: "Fitting" })).toHaveAttribute("aria-pressed", "true");

  await tabs.getByRole("link", { name: /Files/ }).click();
  await page.getByLabel("Photos or documents").setInputFiles({ name: "sheet.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%test") });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("Uploaded 1 file.")).toBeVisible();
  const link = page.getByTestId("files").getByRole("link", { name: /sheet\.pdf/ });
  await expect(link).toBeVisible();
  const href = (await link.getAttribute("href"))!;
  const res = await page.request.get(href); // signed in
  expect(res.headers()["content-type"]).toContain("application/pdf");
  expect((await request.get(href)).status()).toBe(401); // anonymous: no
});
