import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { getProduct } from "./products";
import { pricing } from "./pricing";
import { zoneFor } from "./zip";
import { STATUSES, type Order, type OrderItem, type OrderStatus } from "./order-types";

export type NewOrder = {
  lines: { slug: string; size: string; qty: number }[];
  customer: { email: string; name: string; phone: string; address: string; city: string; state: string; zip: string };
  source: string;
  campaign: string;
};

const clip = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

// HP-7K2Q9M: short, unambiguous, easy to read over the phone.
function newId() {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return "HP-" + Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

// Validates input and recomputes every price server-side from the catalog;
// nothing the browser sends about money is trusted.
export function validateOrder(input: NewOrder) {
  const c = {
    email: clip(input.customer?.email, 200).toLowerCase(),
    name: clip(input.customer?.name, 120),
    phone: clip(input.customer?.phone, 40),
    address: clip(input.customer?.address, 200),
    city: clip(input.customer?.city, 80),
    state: clip(input.customer?.state, 2).toUpperCase(),
    zip: clip(input.customer?.zip, 5),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) return { error: "Please enter a valid email." } as const;
  if (!c.name || !c.address || !c.city) return { error: "Please fill in your shipping details." } as const;
  if (!/^[A-Z]{2}$/.test(c.state)) return { error: "Please use a 2-letter state code." } as const;
  const zone = zoneFor(c.zip);
  if (!zone) return { error: "Please enter a 5-digit ZIP." } as const;
  if (zone === "excluded" || ["AK", "HI"].includes(c.state)) return { error: "Sorry, we don't ship to AK, HI or U.S. territories yet." } as const;

  const items: OrderItem[] = [];
  for (const l of Array.isArray(input.lines) ? input.lines.slice(0, 30) : []) {
    const p = getProduct(String(l.slug));
    const size = p?.sizes.find((s) => s.label === l.size);
    const qty = Math.floor(Number(l.qty));
    if (!p || !size || !size.inStock || !(qty >= 1 && qty <= 20)) return { error: "Something in your cart is no longer available. Please refresh." } as const;
    items.push({ slug: p.slug, name: p.name, size: size.label, qty, price: size.price });
  }
  if (items.length === 0) return { error: "Your cart is empty." } as const;

  const p = pricing(items);
  return {
    order: {
      ...c,
      zone,
      items,
      vials: p.vials,
      subtotal: p.subtotal,
      discount: p.discount,
      shipping: p.shipping,
      total: p.grandTotal,
      source: clip(input.source, 40).toLowerCase() || "direct",
      campaign: clip(input.campaign, 120),
    },
  } as const;
}

export async function createOrder(input: NewOrder): Promise<{ order: Order } | { error: string }> {
  const v = validateOrder(input);
  if ("error" in v) return { error: v.error as string };
  const sql = await db();
  const o = v.order;
  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = await sql<Order[]>`
      insert into orders ${sql({ id: newId(), ...o, items: sql.json(o.items) } as Record<string, unknown>)}
      on conflict (id) do nothing
      returning *`;
    if (rows[0]) return { order: normalize(rows[0]) };
  }
  return { error: "Couldn't create your order. Please try again." };
}

function normalize(o: Order): Order {
  const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : (d as string | null));
  return {
    ...o,
    created_at: iso(o.created_at)!,
    updated_at: iso(o.updated_at)!,
    paid_at: iso(o.paid_at),
    shipped_at: iso(o.shipped_at),
    delivered_at: iso(o.delivered_at),
  };
}

export async function listOrders(range?: { from: Date; to: Date }): Promise<Order[]> {
  const sql = await db();
  const rows = range
    ? await sql<Order[]>`select * from orders where created_at >= ${range.from} and created_at < ${range.to} order by created_at desc`
    : await sql<Order[]>`select * from orders order by created_at desc`;
  return rows.map(normalize);
}

export async function setStatus(id: string, status: OrderStatus, tracking?: string) {
  if (!STATUSES.includes(status)) throw new Error("Unknown status");
  const sql = await db();
  await sql`
    update orders set
      status = ${status},
      tracking = coalesce(${tracking ?? null}, tracking),
      paid_at = case when ${status} in ('paid','packed','shipped','delivered') then coalesce(paid_at, now()) else paid_at end,
      shipped_at = case when ${status} in ('shipped','delivered') then coalesce(shipped_at, now()) else shipped_at end,
      delivered_at = case when ${status} = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
      updated_at = now()
    where id = ${id}`;
}

export async function setNotes(id: string, notes: string) {
  const sql = await db();
  await sql`update orders set notes = ${clip(notes, 2000)}, updated_at = now() where id = ${id}`;
}

// For your payment processor's webhook: call this once a payment is confirmed.
export async function markPaid(id: string) {
  const sql = await db();
  await sql`update orders set status = 'paid', paid_at = coalesce(paid_at, now()), updated_at = now() where id = ${id} and status = 'pending_payment'`;
}
