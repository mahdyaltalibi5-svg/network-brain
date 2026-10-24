import { business } from "@/content/business";
import { isPh } from "./ph";

/**
 * Booking for /book, from `business.bookingUrl` (a Google Calendar appointment schedule).
 *
 * - Full schedule URL (calendar.google.com/calendar/appointments/schedules/…): embedded inline.
 *   `gv=true` is Google's embed mode; that page allows framing.
 * - Short share link (calendar.app.google/…): Google sends X-Frame-Options: SAMEORIGIN, so it
 *   can't be framed. It is offered as a button that opens Google's booking page.
 * - Anything else that is a real https URL (another provider): offered as a button.
 * - Not set yet: no online booking; /book falls back to an email request.
 */
export type Booking =
  | { kind: "embed"; embedSrc: string; href: string }
  | { kind: "link"; href: string }
  | { kind: "none" };

export function parseBooking(raw: string): Booking {
  if (!raw || isPh(raw)) return { kind: "none" };
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { kind: "none" };
  }
  if (url.protocol !== "https:") return { kind: "none" };
  if (url.hostname === "calendar.google.com" && url.pathname.startsWith("/calendar/appointments/schedules/")) {
    const embed = new URL(url);
    embed.searchParams.set("gv", "true");
    const page = new URL(url);
    page.searchParams.delete("gv");
    return { kind: "embed", embedSrc: embed.toString(), href: page.toString() };
  }
  return { kind: "link", href: url.toString() };
}

export const booking = parseBooking(business.bookingUrl);

/** Pre-filled email request: works from day one, and stays as the fallback beside the calendar. */
export function bookingMailto() {
  const subject = "Private fitting request";
  const body = [
    "Hello Summit Customs,",
    "",
    "I'd like to book a private fitting.",
    "",
    "Name:",
    "Phone:",
    "What it's for (business / wedding / image consulting / executive wardrobe):",
    "Dates and times that suit me:",
    "Wedding or event date, if any:",
    "",
    "Thank you",
  ].join("\n");
  return `mailto:${business.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
