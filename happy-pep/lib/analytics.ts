import { SOLD, TO_FULFILL, type Order, type OrderStatus } from "./order-types";
import { site } from "./site";

export const RANGES = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
} as const;
export type RangeKey = keyof typeof RANGES;
export const isRange = (r: unknown): r is RangeKey => typeof r === "string" && r in RANGES;

const TZ = site.timeZone;
const DAY = 86400000;

// "YYYY-MM-DD" for an instant, in Mountain Time.
export const denverDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const denverHour = (d: Date) => +new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(d);

// The UTC instant of midnight Mountain Time on a "YYYY-MM-DD" day.
function denverMidnight(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  for (const offset of [6, 7]) {
    const t = new Date(Date.UTC(y, m - 1, d, offset));
    if (denverHour(t) === 0 && denverDay(t) === day) return t;
  }
  return new Date(Date.UTC(y, m - 1, d, 7));
}

export function rangeBounds(key: RangeKey, now = new Date()) {
  const today = denverMidnight(denverDay(now));
  const end = new Date(now.getTime() + 1000);
  if (key === "all") return { from: new Date(0), to: end, prevFrom: null, days: null };
  const days = key === "today" ? 1 : parseInt(key);
  const from = key === "today" ? today : denverMidnight(denverDay(new Date(today.getTime() - (days - 1) * DAY)));
  const span = end.getTime() - from.getTime();
  return { from, to: end, prevFrom: new Date(from.getTime() - span), days };
}

type Bucket = { key: string; label: string; revenue: number; orders: number };

function buckets(orders: Order[], key: RangeKey, from: Date, now: Date): Bucket[] {
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...o });
  if (key === "today") {
    const hours = Array.from({ length: denverHour(now) + 1 }, (_, h) => ({
      key: String(h),
      label: fmt({ hour: "numeric" }).format(new Date(from.getTime() + h * 3600000)),
      revenue: 0,
      orders: 0,
    }));
    for (const o of orders) {
      const b = hours[denverHour(new Date(o.created_at))];
      if (b) {
        b.revenue += o.total;
        b.orders++;
      }
    }
    return hours;
  }
  const start = key === "all" && orders.length ? new Date(orders.at(-1)!.created_at) : from;
  const span = Math.ceil((now.getTime() - start.getTime()) / DAY) + 1;
  const monthly = span > 120;
  const map = new Map<string, Bucket>();
  if (monthly) {
    const d = new Date(start);
    while (d <= now) {
      const k = denverDay(d).slice(0, 7);
      if (!map.has(k)) map.set(k, { key: k, label: fmt({ month: "short", year: "2-digit" }).format(d), revenue: 0, orders: 0 });
      d.setTime(d.getTime() + 20 * DAY);
    }
    const last = denverDay(now).slice(0, 7);
    if (!map.has(last)) map.set(last, { key: last, label: fmt({ month: "short", year: "2-digit" }).format(now), revenue: 0, orders: 0 });
  } else {
    for (let t = start.getTime(); denverDay(new Date(t)) <= denverDay(now); t += DAY) {
      const k = denverDay(new Date(t));
      map.set(k, { key: k, label: fmt({ month: "short", day: "numeric" }).format(new Date(t)), revenue: 0, orders: 0 });
    }
  }
  for (const o of orders) {
    const k = denverDay(new Date(o.created_at)).slice(0, monthly ? 7 : 10);
    const b = map.get(k);
    if (b) {
      b.revenue += o.total;
      b.orders++;
    }
  }
  return [...map.values()];
}

function group<T extends string>(orders: Order[], keyOf: (o: Order) => T | T[]) {
  const m = new Map<T, { key: T; revenue: number; orders: number; units: number }>();
  for (const o of orders) {
    for (const k of ([] as T[]).concat(keyOf(o))) {
      const g = m.get(k) ?? { key: k, revenue: 0, orders: 0, units: 0 };
      g.revenue += o.total;
      g.orders++;
      m.set(k, g);
    }
  }
  return [...m.values()].sort((a, b) => b.revenue - a.revenue);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function summarize(all: Order[], key: RangeKey, now = new Date()) {
  const { from, prevFrom } = rangeBounds(key, now);
  const inRange = all.filter((o) => new Date(o.created_at) >= from);
  const sold = inRange.filter((o) => SOLD.includes(o.status));
  const prev = prevFrom ? all.filter((o) => SOLD.includes(o.status) && new Date(o.created_at) >= prevFrom && new Date(o.created_at) < from) : null;

  const revenue = r2(sold.reduce((n, o) => n + o.total, 0));
  const prevRevenue = prev ? r2(prev.reduce((n, o) => n + o.total, 0)) : null;
  const awaiting = inRange.filter((o) => o.status === "pending_payment");

  const products = new Map<string, { key: string; revenue: number; units: number }>();
  for (const o of sold) {
    const share = o.subtotal ? o.total / o.subtotal : 1;
    for (const i of o.items) {
      const k = `${i.name} ${i.size}`;
      const p = products.get(k) ?? { key: k, revenue: 0, units: 0 };
      p.units += i.qty;
      p.revenue += i.qty * i.price * share;
      products.set(k, p);
    }
  }

  const statusCounts = Object.fromEntries(
    (["pending_payment", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"] as OrderStatus[]).map((s) => [s, all.filter((o) => o.status === s).length]),
  ) as Record<OrderStatus, number>;

  return {
    range: key,
    kpis: {
      revenue,
      prevRevenue,
      orders: sold.length,
      prevOrders: prev?.length ?? null,
      aov: sold.length ? r2(revenue / sold.length) : 0,
      vials: sold.reduce((n, o) => n + o.vials, 0),
      savingsGiven: r2(sold.reduce((n, o) => n + o.discount, 0)),
      awaitingCount: awaiting.length,
      awaitingValue: r2(awaiting.reduce((n, o) => n + o.total, 0)),
      conversion: inRange.length ? sold.length / inRange.length : null,
    },
    series: buckets(sold, key, from, now),
    states: group(sold, (o) => o.state),
    cities: group(sold, (o) => `${o.city}, ${o.state}`).slice(0, 8),
    zones: group(sold, (o) => o.zone),
    sources: group(sold, (o) => o.source || "direct"),
    products: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    // The work queue ignores the date filter: anything paid and not yet shipped.
    queue: all
      .filter((o) => TO_FULFILL.includes(o.status))
      .sort((a, b) => (a.zone === "sameday" ? 0 : 1) - (b.zone === "sameday" ? 0 : 1) || a.created_at.localeCompare(b.created_at)),
    statusCounts,
  };
}

export type Summary = ReturnType<typeof summarize>;
