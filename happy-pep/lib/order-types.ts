// Shared order shapes and status metadata (safe to import from client code).

export type OrderItem = { slug: string; name: string; size: string; qty: number; price: number };

export type Order = {
  id: string;
  created_at: string;
  updated_at: string;
  status: OrderStatus;
  email: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  zone: "sameday" | "utah" | "usa";
  items: OrderItem[];
  vials: number;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  source: string;
  campaign: string;
  tracking: string;
  notes: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
};

export const STATUSES = ["pending_payment", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"] as const;
export type OrderStatus = (typeof STATUSES)[number];

export const STATUS_META: Record<OrderStatus, { label: string; icon: string; tone: "muted" | "warning" | "info" | "good" | "critical" }> = {
  pending_payment: { label: "Awaiting payment", icon: "⏳", tone: "muted" },
  paid: { label: "Paid · to pack", icon: "●", tone: "warning" },
  packed: { label: "Packed", icon: "▣", tone: "info" },
  shipped: { label: "Shipped", icon: "➜", tone: "info" },
  delivered: { label: "Delivered", icon: "✓", tone: "good" },
  cancelled: { label: "Cancelled", icon: "✕", tone: "critical" },
  refunded: { label: "Refunded", icon: "↺", tone: "critical" },
};

// Statuses that count as revenue.
export const SOLD: OrderStatus[] = ["paid", "packed", "shipped", "delivered"];
// Statuses that still need work from you.
export const TO_FULFILL: OrderStatus[] = ["paid", "packed"];

export const ZONE_LABEL = { sameday: "Same-day zone", utah: "Rest of Utah", usa: "Out of state" } as const;
