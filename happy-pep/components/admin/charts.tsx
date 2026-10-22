"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Chart palette (validated: CVD-safe, direct labels carry the low-contrast aqua).
export const VIZ = { s1: "#3358E8", s2: "#EB6834", s3: "#1BAF7A", grid: "#E6E8F0", axis: "#C9CCD8", muted: "#8A8FA3" };

export const usd = (n: number, compact = false) =>
  compact && Math.abs(n) >= 1000
    ? `$${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`
    : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0, minimumFractionDigits: n % 1 ? 2 : 0 });

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

type Tip = { x: number; y: number; title: string; value: string; sub?: string } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-[#0B0F2E] px-3 py-2 text-xs text-white shadow-lg"
      style={{ left: tip.x, top: tip.y - 8 }}
      role="status"
    >
      <p className="text-sm font-semibold">{tip.value}</p>
      <p className="text-white/70">{tip.title}</p>
      {tip.sub && <p className="text-white/70">{tip.sub}</p>}
    </div>
  );
}

// Single-series revenue columns: 4px rounded caps, hairline grid, hover per column.
export function RevenueColumns({ data }: { data: { key: string; label: string; revenue: number; orders: number }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip>(null);
  const [hover, setHover] = useState<string | null>(null);
  const H = 220;
  const pad = { l: 48, r: 8, t: 12, b: 28 };
  const max = niceMax(Math.max(...data.map((d) => d.revenue), 0));
  const plotW = Math.max(0, width - pad.l - pad.r);
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(2, Math.min(24, band - 2));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, max / 2, max];
  const every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 64))));

  return (
    <div ref={ref} className="relative w-full" onPointerLeave={() => (setTip(null), setHover(null))}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label="Revenue over time">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? VIZ.axis : VIZ.grid} strokeWidth={1} />
              <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={VIZ.muted} style={{ fontVariantNumeric: "tabular-nums" }}>
                {usd(t, true)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.l + band * i + band / 2;
            const top = y(d.revenue);
            const h = y(0) - top;
            const r = Math.min(4, h, barW / 2);
            return (
              <g key={d.key}>
                {d.revenue > 0 && (
                  <path
                    d={`M${cx - barW / 2},${y(0)} V${top + r} Q${cx - barW / 2},${top} ${cx - barW / 2 + r},${top} H${cx + barW / 2 - r} Q${cx + barW / 2},${top} ${cx + barW / 2},${top + r} V${y(0)} Z`}
                    fill={VIZ.s1}
                    opacity={hover && hover !== d.key ? 0.45 : 1}
                  />
                )}
                {i % every === 0 && (
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill={VIZ.muted}>
                    {d.label}
                  </text>
                )}
                {/* hit area: the whole column band */}
                <rect
                  x={pad.l + band * i}
                  y={pad.t}
                  width={band}
                  height={H - pad.t - pad.b}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.label}: ${usd(d.revenue)}, ${d.orders} orders`}
                  onPointerMove={() => (setHover(d.key), setTip({ x: cx, y: top, title: d.label, value: usd(d.revenue), sub: `${d.orders} order${d.orders === 1 ? "" : "s"}` }))}
                  onFocus={() => (setHover(d.key), setTip({ x: cx, y: top, title: d.label, value: usd(d.revenue), sub: `${d.orders} orders` }))}
                  onBlur={() => (setTip(null), setHover(null))}
                />
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

// Ranked horizontal bars, one color, value at the tip.
export function BarList({ rows, format = usd, sub }: { rows: { key: string; value: number }[]; format?: (n: number) => string; sub?: (key: string) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 0) || 1;
  if (rows.length === 0) return <Empty />;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-[#0B0F2E]">{r.key}</span>
            <span className="shrink-0 font-semibold tabular-nums text-[#0B0F2E]">
              {format(r.value)}
              {sub && <span className="ml-1.5 font-normal text-[#6B7085]">{sub(r.key)}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#F0F2F8]">
            <div className="h-2 rounded-full transition-[width] duration-500" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: VIZ.s1 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Part-to-whole for up to 3 categories: one stacked bar with 2px gaps, legend + direct labels.
export function ShareBar({ parts }: { parts: { key: string; label: string; value: number; color: string }[] }) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  if (!total) return <Empty />;
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {parts.filter((p) => p.value > 0).map((p) => (
          <div key={p.key} title={`${p.label}: ${usd(p.value)}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: p.color }} aria-hidden />
            <span className="text-[#6B7085]">{p.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-[#0B0F2E]">
              {Math.round((p.value / total) * 100)}% <span className="font-normal text-[#8A8FA3]">· {usd(p.value)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// US tile-grid map: every state the same size, shaded by revenue (one-hue ramp).
const GRID: [string, number, number][] = [
  ["AK", 0, 0], ["ME", 11, 0],
  ["WI", 6, 1], ["VT", 10, 1], ["NH", 11, 1],
  ["WA", 1, 2], ["ID", 2, 2], ["MT", 3, 2], ["ND", 4, 2], ["MN", 5, 2], ["IL", 6, 2], ["MI", 7, 2], ["NY", 9, 2], ["MA", 10, 2],
  ["OR", 1, 3], ["NV", 2, 3], ["WY", 3, 3], ["SD", 4, 3], ["IA", 5, 3], ["IN", 6, 3], ["OH", 7, 3], ["PA", 8, 3], ["NJ", 9, 3], ["CT", 10, 3], ["RI", 11, 3],
  ["CA", 1, 4], ["UT", 2, 4], ["CO", 3, 4], ["NE", 4, 4], ["MO", 5, 4], ["KY", 6, 4], ["WV", 7, 4], ["VA", 8, 4], ["MD", 9, 4], ["DE", 10, 4],
  ["AZ", 2, 5], ["NM", 3, 5], ["KS", 4, 5], ["AR", 5, 5], ["TN", 6, 5], ["NC", 7, 5], ["SC", 8, 5], ["DC", 9, 5],
  ["OK", 4, 6], ["LA", 5, 6], ["MS", 6, 6], ["AL", 7, 6], ["GA", 8, 6],
  ["HI", 0, 7], ["TX", 4, 7], ["FL", 9, 7],
];
const RAMP = ["#EEF0F6", "#D6DEFB", "#A9BAF5", "#7590EF", "#3358E8", "#1A36A8"];

export function StateTileMap({ states }: { states: { key: string; revenue: number; orders: number }[] }) {
  const by = new Map(states.map((s) => [s.key, s]));
  const max = Math.max(...states.map((s) => s.revenue), 0);
  const [tip, setTip] = useState<Tip>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const bin = (v: number) => (v <= 0 || !max ? 0 : Math.min(5, 1 + Math.floor((v / max) * 4.999)));

  return (
    <div>
      <div ref={wrap} className="relative" onPointerLeave={() => setTip(null)}>
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
          {Array.from({ length: 8 * 12 }, (_, i) => {
            const col = i % 12;
            const row = Math.floor(i / 12);
            const cell = GRID.find(([, c, r]) => c === col && r === row);
            if (!cell) return <div key={i} />;
            const [st] = cell;
            const d = by.get(st);
            const b = bin(d?.revenue ?? 0);
            const show = (e: React.SyntheticEvent<HTMLElement>) => {
              const r = e.currentTarget.getBoundingClientRect();
              const w = wrap.current!.getBoundingClientRect();
              setTip({ x: r.left - w.left + r.width / 2, y: r.top - w.top, title: st, value: d ? usd(d.revenue) : "No sales", sub: d ? `${d.orders} order${d.orders === 1 ? "" : "s"}` : undefined });
            };
            return (
              <div
                key={i}
                tabIndex={0}
                onPointerMove={show}
                onFocus={show}
                onBlur={() => setTip(null)}
                aria-label={`${st}: ${d ? `${usd(d.revenue)}, ${d.orders} orders` : "no sales"}`}
                className="grid aspect-square place-items-center rounded-[5px] text-[9px] font-semibold outline-none ring-[#0B0F2E] transition-transform hover:scale-110 focus-visible:ring-2 sm:text-[11px]"
                style={{ background: RAMP[b], color: b >= 4 ? "#fff" : b === 0 ? "#9CA0B3" : "#0B0F2E" }}
              >
                {st}
              </div>
            );
          })}
        </div>
        <Tooltip tip={tip} />
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-[#6B7085]">
        <span>Less</span>
        {RAMP.slice(1).map((c) => (
          <span key={c} className="h-2.5 w-6 rounded-sm" style={{ background: c }} aria-hidden />
        ))}
        <span>More revenue</span>
      </div>
    </div>
  );
}

export function Empty({ text = "No sales in this period yet." }: { text?: string }) {
  return <p className="grid min-h-24 place-items-center rounded-2xl bg-[#F7F8FB] px-4 text-center text-sm text-[#8A8FA3]">{text}</p>;
}
