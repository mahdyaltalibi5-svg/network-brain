import { priceOf } from "./products";
import { site } from "./site";

type Line = { slug: string; size: string; qty: number };

export type Pricing = {
  vials: number;
  subtotal: number;
  discount: number;
  total: number;
  off: number;
  // The next stack tier to unlock, if any.
  nextTier: { min: number; off: number; need: number } | null;
  freeShipping: boolean;
  toFreeShipping: number;
  shipping: number;
  // What the customer pays: total after discount, plus shipping.
  grandTotal: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

export function pricing(lines: Line[]): Pricing {
  const vials = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = round(lines.reduce((n, l) => n + l.qty * priceOf(l.slug, l.size), 0));
  const tiers = [...site.stackTiers].sort((a, b) => a.min - b.min);
  const tier = tiers.filter((t) => vials >= t.min).at(-1);
  const off = tier?.off ?? 0;
  const discount = round(subtotal * off);
  const total = round(subtotal - discount);
  const next = tiers.find((t) => vials < t.min);
  const freeShipping = total >= site.freeShippingMin;
  const shipping = freeShipping || vials === 0 ? 0 : site.shippingRate;
  return {
    vials,
    subtotal,
    discount,
    total,
    off,
    nextTier: next ? { ...next, need: next.min - vials } : null,
    freeShipping,
    toFreeShipping: round(Math.max(0, site.freeShippingMin - total)),
    shipping,
    grandTotal: round(total + shipping),
  };
}

export const pct = (off: number) => `${Math.round(off * 100)}%`;
