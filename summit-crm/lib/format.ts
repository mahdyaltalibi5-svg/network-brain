export const money = (n: number | null | undefined, opts: { cents?: boolean } = {}) =>
  n == null ? "—" : (opts.cents ? n / 100 : n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n >= 1000 ? 0 : 2 });

export const num = (n: number) => n.toLocaleString("en-US");

/** "3h ago", "2d ago". Server-rendered per request, so `now` is the request time. */
export function ago(d: Date, now = new Date()) {
  const s = Math.max(0, (now.getTime() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const when = (d: Date) =>
  d.toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export const sourceLabel = { meta: "Meta ad", website: "Website", manual: "Added by hand" } as const;

/** "1,850" or "$1850.50" → 185050 cents. Empty or invalid → null. */
export function parseMoney(raw: string): number | null {
  const n = Number(raw.replace(/[$,\s]/g, ""));
  return raw.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
