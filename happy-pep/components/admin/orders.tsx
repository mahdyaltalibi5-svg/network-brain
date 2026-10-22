"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { removeOrder, updateOrderNotes, updateOrderStatus } from "@/app/admin/actions";
import { StatusBadge, ZoneBadge } from "./status";
import { usd } from "./charts";
import { STATUS_META, STATUSES, ZONE_LABEL, type Order, type OrderStatus } from "@/lib/order-types";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// The one obvious next step for each status.
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending_payment: { to: "paid", label: "Mark paid" },
  paid: { to: "packed", label: "Mark packed" },
  packed: { to: "shipped", label: "Mark shipped" },
  shipped: { to: "delivered", label: "Mark delivered" },
};

function OrderDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [tracking, setTracking] = useState(order.tracking);
  const [notes, setNotes] = useState(order.notes);
  const next = NEXT[order.status];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const act = (to: OrderStatus) => start(() => updateOrderStatus(order.id, to, to === "shipped" ? tracking : undefined));
  const address = `${order.name}\n${order.address}\n${order.city}, ${order.state} ${order.zip}`;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Order ${order.id}`}>
      <motion.div className="absolute inset-0 bg-[#0B0F2E]/30" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside
        className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#E6E8F0] bg-white px-6 py-4">
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold">
              {order.id} <ZoneBadge zone={order.zone} />
            </p>
            <p className="text-xs text-[#8A8FA3]">Placed {when(order.created_at)} MT · from {order.source}</p>
          </div>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-lg hover:bg-[#F0F2F8]" aria-label="Close">
            ✕
          </button>
        </header>

        <div className={`space-y-6 px-6 py-5 transition-opacity ${pending ? "opacity-60" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            {order.paid_at && <span className="text-xs text-[#8A8FA3]">Paid {when(order.paid_at)}</span>}
            {order.shipped_at && <span className="text-xs text-[#8A8FA3]">· Shipped {when(order.shipped_at)}</span>}
          </div>

          {next && (
            <div className="space-y-2 rounded-2xl bg-[#F5F6FA] p-4">
              {next.to === "shipped" && (
                <input
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="Tracking number (optional)"
                  className="h-11 w-full rounded-xl bg-white px-3 text-sm outline-none ring-1 ring-[#E6E8F0] focus:ring-2 focus:ring-pep-blue"
                />
              )}
              <button onClick={() => act(next.to)} disabled={pending} className="h-11 w-full rounded-xl bg-pep-blue text-sm font-semibold text-white disabled:opacity-60">
                {next.label}
              </button>
            </div>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8FA3]">Items</h3>
            <ul className="divide-y divide-[#F0F2F8] rounded-2xl ring-1 ring-[#E6E8F0]">
              {order.items.map((i) => (
                <li key={`${i.slug}-${i.size}`} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                  <span>
                    <b>{i.qty}×</b> {i.name} {i.size}
                  </span>
                  <span className="tabular-nums">{usd(i.qty * i.price)}</span>
                </li>
              ))}
              <li className="flex justify-between px-4 py-2.5 text-sm text-[#6B7085]">
                <span>💧 Free BAC water</span>
                <span>$0</span>
              </li>
            </ul>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between text-[#6B7085]">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{usd(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-[#6B7085]">
                  <dt>Stack savings</dt>
                  <dd className="tabular-nums">−{usd(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-[#6B7085]">
                <dt>Shipping</dt>
                <dd className="tabular-nums">{order.shipping ? usd(order.shipping) : "Free"}</dd>
              </div>
              <div className="flex justify-between border-t border-[#E6E8F0] pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{usd(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8FA3]">Ship to</h3>
              <p className="whitespace-pre-line text-sm">{address}</p>
              <p className="mt-1 text-xs text-[#8A8FA3]">{ZONE_LABEL[order.zone]}</p>
              <button onClick={() => navigator.clipboard?.writeText(address)} className="mt-2 text-xs font-semibold text-pep-blue">
                Copy address
              </button>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8FA3]">Contact</h3>
              <a href={`mailto:${order.email}`} className="block break-all text-sm text-pep-blue">
                {order.email}
              </a>
              {order.phone && (
                <a href={`tel:${order.phone}`} className="block text-sm text-pep-blue">
                  {order.phone}
                </a>
              )}
              {order.tracking && <p className="mt-2 text-xs text-[#6B7085]">Tracking: {order.tracking}</p>}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8FA3]">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== order.notes && start(() => updateOrderNotes(order.id, notes))}
              rows={3}
              placeholder="Private notes (saved when you click away)"
              className="w-full rounded-xl bg-[#F5F6FA] p-3 text-sm outline-none ring-1 ring-[#E6E8F0] focus:ring-2 focus:ring-pep-blue"
            />
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8FA3]">Set status</h3>
            <div className="flex flex-wrap gap-2">
              {STATUSES.filter((s) => s !== order.status).map((s) => (
                <button key={s} onClick={() => act(s)} disabled={pending} className="rounded-full px-1 transition-opacity hover:opacity-80 disabled:opacity-50">
                  <StatusBadge status={s} />
                </button>
              ))}
            </div>
          </section>

          <section className="border-t border-[#E6E8F0] pt-5">
            <button
              onClick={() => {
                if (!confirm(`Permanently delete ${order.id}? Use this for test or spam orders only.`)) return;
                start(async () => {
                  await removeOrder(order.id);
                  onClose();
                });
              }}
              disabled={pending}
              className="text-sm font-semibold text-[#A32A2A] hover:underline disabled:opacity-50"
            >
              Delete order
            </button>
          </section>
        </div>
      </motion.aside>
    </div>
  );
}

export function OrdersView({ orders, initialStatus, initialOpen }: { orders: Order[]; initialStatus: string; initialOpen: string | null }) {
  const [status, setStatus] = useState<string>(initialStatus);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialOpen);
  const open = orders.find((o) => o.id === openId) ?? null;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders.filter(
      (o) =>
        (status === "all" || o.status === status) &&
        (!needle || [o.id, o.name, o.email, o.city, o.state, o.zip, o.phone].some((f) => f.toLowerCase().includes(needle))),
    );
  }, [orders, status, q]);

  // Keep the URL shareable without a server round trip.
  useEffect(() => {
    const u = new URL(location.href);
    if (status === "all") u.searchParams.delete("status");
    else u.searchParams.set("status", status);
    if (openId) u.searchParams.set("open", openId);
    else u.searchParams.delete("open");
    history.replaceState(null, "", u);
  }, [status, openId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Orders</h1>
        <a href="/admin/orders/export" className="rounded-xl bg-white px-3 py-2 text-sm font-medium ring-1 ring-[#E6E8F0] hover:bg-[#F5F6FA]">
          ⬇ Export CSV
        </a>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search order #, name, email, city, ZIP…"
          className="h-11 w-full rounded-xl bg-white px-4 text-sm outline-none ring-1 ring-[#E6E8F0] focus:ring-2 focus:ring-pep-blue lg:max-w-sm"
        />
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-[#E6E8F0]">
          {["all", ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${status === s ? "bg-pep-blue text-white" : "text-[#6B7085] hover:bg-[#F0F2F8]"}`}
            >
              {s === "all" ? "All" : STATUS_META[s as OrderStatus].label} <span className="opacity-60">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#E6E8F0]">
        {shown.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#8A8FA3]">{orders.length ? "No orders match." : "No orders yet. They'll show up here the moment someone checks out."}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="hidden border-b border-[#E6E8F0] text-xs text-[#8A8FA3] md:table-header-group">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Ships to</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2F8]">
              {shown.map((o) => (
                <tr key={o.id} onClick={() => setOpenId(o.id)} className="cursor-pointer hover:bg-[#F8F9FC]">
                  {/* Phone: one stacked cell. Desktop: full columns. */}
                  <td className="px-4 py-3 md:hidden" colSpan={6}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-semibold">
                          {o.id} <ZoneBadge zone={o.zone} />
                        </p>
                        <p className="truncate text-xs text-[#8A8FA3]">
                          {o.name} · {o.city}, {o.state} · {when(o.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">{usd(o.total)}</p>
                        <div className="mt-1">
                          <StatusBadge status={o.status} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <button className="font-semibold text-left" onClick={() => setOpenId(o.id)}>
                      {o.id}
                    </button>
                    <p className="text-xs text-[#8A8FA3]">{when(o.created_at)}</p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <p>{o.name}</p>
                    <p className="text-xs text-[#8A8FA3]">{o.email}</p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <p className="flex items-center gap-2">
                      {o.city}, {o.state} <ZoneBadge zone={o.zone} />
                    </p>
                    <p className="text-xs text-[#8A8FA3]">{o.zip}</p>
                  </td>
                  <td className="hidden max-w-56 px-4 py-3 md:table-cell">
                    <p className="truncate">{o.items.map((i) => `${i.qty}× ${i.name} ${i.size}`).join(", ")}</p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-right font-semibold tabular-nums md:table-cell">{usd(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>{open && <OrderDrawer key={open.id} order={open} onClose={() => setOpenId(null)} />}</AnimatePresence>
    </div>
  );
}
