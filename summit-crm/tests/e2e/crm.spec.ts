import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, next = "/") {
  await page.goto(next);
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Password").fill("e2e-password");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("everything is private until you sign in", async ({ page, request }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  expect((await request.get("/api/meta/sync")).status()).toBe(401);
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That password isn't right.")).toBeVisible();
});

test("website lead → pipeline → booked → ordered, with notes", async ({ page, request }) => {
  const res = await request.post("/api/leads", {
    data: { name: "Alex Park", email: "alex@example.com", phone: "801-555-0100", occasion: "Wedding", notes: "Wedding June 14" },
    headers: { origin: "https://summitcustomsuits.com" },
  });
  expect(res.status()).toBe(201);

  await signIn(page);
  await expect(page).toHaveURL(/\/$/);
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
  await signIn(page, "/settings");
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { level: 1, name: "Connections" })).toBeVisible();
  await expect(page.getByText("/api/meta/webhook")).toBeVisible();
  await expect(page.locator("li", { hasText: "Conversions API" }).getByText("Not set up")).toBeVisible();
  await page.getByRole("link", { name: "Meta ads" }).click();
  await expect(page.getByText(/Ad spend isn.t connected yet/)).toBeVisible();
  await page.getByRole("link", { name: "Last 7 days" }).click();
  await expect(page).toHaveURL(/range=last_7d/);
});
