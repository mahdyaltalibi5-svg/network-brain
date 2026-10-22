import { site } from "./site";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function denverNow(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: site.timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    day: DAYS.indexOf(parts.weekday),
    secs: +parts.hour * 3600 + +parts.minute * 60 + +parts.second,
    // Calendar date in Mountain Time, as a UTC-midnight Date for day math.
    date: new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day)),
  };
}

const isBizDay = (d: Date) => d.getUTCDay() >= 1 && d.getUTCDay() <= 5;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

function nextBizDay(d: Date) {
  let x = addDays(d, 1);
  while (!isBizDay(x)) x = addDays(x, 1);
  return x;
}

export type CutoffState =
  | { open: true; secondsLeft: number }
  | { open: false; next: "tomorrow" | "Monday" };

// Same-day window: Mon–Fri, before the cutoff hour in Mountain Time.
export function cutoffState(now = new Date()): CutoffState {
  const { day, secs } = denverNow(now);
  const cutoff = site.cutoffHour * 3600;
  if (day >= 1 && day <= 5 && secs < cutoff) return { open: true, secondsLeft: cutoff - secs };
  const nextDay = (day + 1) % 7;
  return { open: false, next: nextDay >= 1 && nextDay <= 5 ? "tomorrow" : "Monday" };
}

export type Delivery = {
  // Day the order ships (and same-day Utah orders arrive).
  shipDay: Date;
  shipsToday: boolean;
  // Latest arrival under the nationwide guarantee.
  guaranteedBy: Date;
};

// Holidays aren't modeled; carriers' holiday closures count as excluded delays.
export function delivery(now = new Date()): Delivery {
  const { secs, date } = denverNow(now);
  const shipsToday = isBizDay(date) && secs < site.cutoffHour * 3600;
  const shipDay = shipsToday ? date : nextBizDay(date);
  let by = shipDay;
  for (let i = 0; i < site.guaranteeDays; i++) by = nextBizDay(by);
  return { shipDay, shipsToday, guaranteedBy: by };
}

export const fmtDay = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
