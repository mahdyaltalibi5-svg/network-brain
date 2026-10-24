import { expect, test } from "@playwright/test";
import { parseBooking } from "../lib/booking";

test("booking link parser: embeds full Google schedule URLs, links short ones, ignores placeholders", () => {
  const full = parseBooking("https://calendar.google.com/calendar/appointments/schedules/AcZssZ1abc?gv=true");
  expect(full).toEqual({
    kind: "embed",
    embedSrc: "https://calendar.google.com/calendar/appointments/schedules/AcZssZ1abc?gv=true",
    href: "https://calendar.google.com/calendar/appointments/schedules/AcZssZ1abc",
  });
  const noGv = parseBooking("https://calendar.google.com/calendar/appointments/schedules/AcZssZ1abc");
  expect(noGv.kind === "embed" && noGv.embedSrc.endsWith("?gv=true")).toBe(true);
  // short share links refuse framing (X-Frame-Options: SAMEORIGIN), so they become a button
  expect(parseBooking("https://calendar.app.google/XyZ123")).toEqual({ kind: "link", href: "https://calendar.app.google/XyZ123" });
  expect(parseBooking("[PLACEHOLDER: Google Calendar link]").kind).toBe("none");
  expect(parseBooking("not a url").kind).toBe("none");
  expect(parseBooking("http://insecure.example.com").kind).toBe("none");
});

test("/book offers a working way to book today", async ({ page }) => {
  await page.goto("/book");
  const cta = page.getByRole("link", { name: /Request a fitting|Choose a time/ }).first();
  await expect(cta).toHaveAttribute("href", "#calendar");
  await cta.click();
  await expect(page.locator("#calendar")).toBeInViewport();

  const iframe = page.locator("#calendar iframe");
  if (await iframe.count()) {
    // calendar configured: Google's embed loads
    await expect(iframe).toHaveAttribute("src", /calendar\.google\.com\/calendar\/appointments\/schedules\/.+gv=true/);
    await expect(iframe).toHaveAttribute("title", /booking calendar/i);
  } else {
    // not configured yet: a pre-filled email request to the studio
    const mail = page.getByRole("link", { name: "Request a fitting by email" });
    const href = await mail.getAttribute("href");
    expect(href).toMatch(/^mailto:Kobe@summitcustomsuits\.com\?subject=Private%20fitting%20request&body=/);
    expect(decodeURIComponent(href!.split("body=")[1])).toContain("Dates and times that suit me:");
  }
});
