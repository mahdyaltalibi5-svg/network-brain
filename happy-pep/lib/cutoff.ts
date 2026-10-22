import { site } from "./site";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type CutoffState =
  | { open: true; secondsLeft: number }
  | { open: false; next: "tomorrow" | "Monday" };

// Same-day Utah window: Mon–Fri, before the cutoff hour in Mountain Time.
export function cutoffState(now = new Date()): CutoffState {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: site.timeZone,
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const day = DAYS.indexOf(parts.weekday);
  const secs = +parts.hour * 3600 + +parts.minute * 60 + +parts.second;
  const cutoff = site.cutoffHour * 3600;

  if (day >= 1 && day <= 5 && secs < cutoff) return { open: true, secondsLeft: cutoff - secs };
  const nextDay = (day + 1) % 7;
  return { open: false, next: nextDay >= 1 && nextDay <= 5 ? "tomorrow" : "Monday" };
}
