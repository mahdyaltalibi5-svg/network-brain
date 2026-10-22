"use client";

import Link from "next/link";
import { BarList, Empty, RevenueColumns, ShareBar, StateTileMap, VIZ, usd } from "./charts";
import { StatusBadge, ZoneBadge } from "./status";
import { RANGES, type RangeKey, type Summary } from "@/lib/analytics";
import { STATUS_META, ZONE_LABEL, type OrderStatus } from "@/lib/order-types";

function Card({ title, sub, action, children, className = "" }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(11,15,46,0.04)] ring-1 ring-[#E6E8F0] ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {sub && <p className="text-xs text-[#8A8FA3]">{sub}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Delta({ now, prev, label }: { now: number; prev: number | null; label: string }) {
  if (prev === null) return null;
  if (prev === 0) return <p className="mt-1 text-xs text-[#8A8FA3]">{now > 0 ? "New" : "–"} vs {label}</p>;
  const change = (now - prev) / prev;
  const up = change >= 0;
  return (
    <p className={`mt-1 text-xs font-semibold ${up ? "text-[#006300]" : "text-[#A32A2A]"}`}>
      <span aria-hidden>{up ? "▲" : "▼"}</span> {Math.abs(Math.round(change * 100))}% <span className="font-normal text-[#8A8FA3]">vs {label}</span>
    </p>
  );
}

function Stat({ label, value, children, className = "" }: { label: string; value: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-4 ring-1 ring-[#E6E8F0] ${className}`}>
      <p className="text-xs font-medium text-[#6B7085]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {children}
    </div>
  );
}

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

export function Dashboard({ data }: { data: Summary }) {
  const { kpis } = data;
  const prevLabel = data.range === "today" ? "yesterday" : `previous ${RANGES[data.range].replace("Last ", "").toLowerCase()}`;
  const zoneParts = (["sameday", "utah", "usa"] as const).map((z, i) => ({
    key: z,
    label: ZONE_LABEL[z],
    value: data.zones.find((g) => g.key === z)?.revenue ?? 0,
    color: [VIZ.s1, VIZ.s2, VIZ.s3][i],
  }));

  return (
    <div className="space-y-5">
      {/* Filter row: scopes everything below except the fulfillment queue. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Overview</h1>
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-[#E6E8F0]">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={`/admin?range=${k}`}
              scroll={false}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${data.range === k ? "bg-pep-blue text-white" : "text-[#6B7085] hover:bg-[#F0F2F8]"}`}
            >
              {RANGES[k]}
            </Link>
          ))}
        </div>
      </div>

      {/* Hero + KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 rounded-2xl bg-white p-5 ring-1 ring-[#E6E8F0] lg:col-span-1">
          <p className="text-sm font-medium text-[#6B7085]">Revenue · {RANGES[data.range]}</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">{usd(kpis.revenue)}</p>
          <Delta now={kpis.revenue} prev={kpis.prevRevenue} label={prevLabel} />
        </div>
        <Stat label="Paid orders" value={kpis.orders.toLocaleString()}>
          <Delta now={kpis.orders} prev={kpis.prevOrders} label={prevLabel} />
        </Stat>
        <Stat label="Avg order value" value={usd(kpis.aov)}>
          <p className="mt-1 text-xs text-[#8A8FA3]">{kpis.orders ? (kpis.vials / kpis.orders).toFixed(1) : "0"} vials per order</p>
        </Stat>
        <Stat label="Awaiting payment" value={kpis.awaitingCount.toLocaleString()} className="col-span-2 lg:col-span-1">
          <p className="mt-1 text-xs text-[#8A8FA3]">{usd(kpis.awaitingValue)} in unpaid checkouts</p>
        </Stat>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Revenue" sub={data.range === "today" ? "By hour, Mountain Time" : "Paid orders, Mountain Time"}>
          {kpis.revenue > 0 ? <RevenueColumns data={data.series} /> : <Empty />}
        </Card>

        <Card
          title="To fulfill"
          sub="Paid, not shipped yet · same-day first"
          action={
            <Link href="/admin/orders?status=paid" className="text-xs font-semibold text-pep-blue">
              All →
            </Link>
          }
        >
          {data.queue.length === 0 ? (
            <Empty text="Nothing to pack. 🎉" />
          ) : (
            <ul className="-mx-2 max-h-[236px] space-y-1 overflow-y-auto">
              {data.queue.slice(0, 12).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders?open=${o.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#F5F6FA]">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        {o.id} <ZoneBadge zone={o.zone} />
                      </p>
                      <p className="truncate text-xs text-[#8A8FA3]">
                        {o.name} · {o.city}, {o.state} · {ago(o.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Where orders ship" sub="Revenue by state">
          {data.states.length ? <StateTileMap states={data.states} /> : <Empty />}
        </Card>
        <div className="space-y-5">
          <Card title="Utah vs. everywhere else" sub="Share of revenue">
            <ShareBar parts={zoneParts} />
          </Card>
          <Card title="Top cities">
            <BarList rows={data.cities.map((c) => ({ key: c.key, value: c.revenue }))} sub={(k) => `${data.cities.find((c) => c.key === k)?.orders ?? 0} orders`} />
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Top products" sub="Revenue after stack savings">
          <BarList rows={data.products.map((p) => ({ key: p.key, value: Math.round(p.revenue) }))} sub={(k) => `×${data.products.find((p) => p.key === k)?.units ?? 0}`} />
        </Card>
        <Card title="Traffic source" sub="First visit before ordering">
          <BarList rows={data.sources.map((s) => ({ key: s.key === "tiktok" ? "TikTok" : s.key[0].toUpperCase() + s.key.slice(1), value: s.revenue }))} />
        </Card>
        <Card title="Order pipeline" sub="All time">
          <ul className="space-y-2">
            {(Object.keys(STATUS_META) as OrderStatus[]).map((s) => (
              <li key={s}>
                <Link href={`/admin/orders?status=${s}`} className="flex items-center justify-between rounded-xl px-2 py-1.5 hover:bg-[#F5F6FA]">
                  <StatusBadge status={s} />
                  <span className="font-semibold tabular-nums">{data.statusCounts[s]}</span>
                </Link>
              </li>
            ))}
          </ul>
          {kpis.savingsGiven > 0 && <p className="mt-3 px-2 text-xs text-[#8A8FA3]">{usd(kpis.savingsGiven)} in stack savings given this period.</p>}
        </Card>
      </div>
    </div>
  );
}
