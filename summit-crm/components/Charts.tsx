"use client";

import { useState } from "react";
import type { DayRow, WeekRow } from "@/lib/dashboard";
import { SOURCE } from "@/lib/ui";

/*
 * Charts follow the dataviz rules: thin marks with 4px rounded data-ends on the baseline, 2px gaps
 * between stacked segments, recessive grid, legend for multi-series, text in text colours (never
 * the series colour), a hover tooltip on every mark, and a table view for screen readers.
 */
const KEYS = ["meta", "website", "manual"] as const;
const dayLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const mins = (m: number) => (m < 1 ? `${Math.round(m * 60)}s` : m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`);

/** Tooltip placed in % of the chart box, so it tracks the mark at any rendered size. */
function Tip({ xPct, yPct, children }: { xPct: number; yPct: number; children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-white/15 bg-black/85 px-3 py-2 text-xs whitespace-nowrap shadow-xl backdrop-blur"
      style={{ left: `clamp(72px, ${xPct}%, calc(100% - 72px))`, top: `calc(${yPct}% - 8px)` }}
    >
      {children}
    </div>
  );
}

export function LeadsChart({ data }: { data: DayRow[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 200, pad = { l: 28, r: 8, t: 10, b: 22 };
  const totals = data.map((d) => d.meta + d.website + d.manual);
  const max = Math.max(4, ...totals);
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const bw = iw / data.length;
  const barW = Math.max(3, Math.min(14, bw * 0.62));
  const y = (v: number) => pad.t + ih - (v / top) * ih;
  const sums = KEYS.map((k) => data.reduce((a, d) => a + d[k], 0));

  return (
    <figure className="relative">
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ivory-dim" aria-hidden="true">
        {KEYS.map((k, i) => (
          <span key={k} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SOURCE[k].color }} />
            {SOURCE[k].short} <span className="text-stone">{sums[i]}</span>
          </span>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Leads per day for the last 30 days, by source" onMouseLeave={() => setHover(null)}>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line x1={pad.l} x2={W - pad.r} y1={y(i * step)} y2={y(i * step)} stroke="#fff" strokeOpacity={i ? 0.06 : 0.14} />
              <text x={pad.l - 6} y={y(i * step)} dy="0.32em" textAnchor="end" fontSize="9" fill="#a39e92">{i * step}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.l + bw * i + bw / 2;
            let acc = 0;
            const segs = KEYS.filter((k) => d[k] > 0);
            return (
              <g key={d.day}>
                {hover === i && <rect x={cx - bw / 2} y={pad.t} width={bw} height={ih} fill="#fff" fillOpacity={0.04} rx={4} />}
                {segs.map((k, si) => {
                  const y0 = y(acc), y1 = y(acc + d[k]);
                  acc += d[k];
                  const isTop = si === segs.length - 1;
                  const h = Math.max(1, y0 - y1 - (si > 0 ? 2 : 0)); // 2px gap between stacked segments
                  const r = isTop ? Math.min(4, barW / 2, h) : 0;
                  const x0 = cx - barW / 2, yt = y1;
                  // rounded data-end on the top segment only; flat on the baseline
                  const path = r
                    ? `M${x0} ${yt + h}V${yt + r}Q${x0} ${yt} ${x0 + r} ${yt}H${x0 + barW - r}Q${x0 + barW} ${yt} ${x0 + barW} ${yt + r}V${yt + h}Z`
                    : `M${x0} ${yt}H${x0 + barW}V${yt + h}H${x0}Z`;
                  return <path key={k} d={path} fill={SOURCE[k].color} />;
                })}
                <rect x={cx - bw / 2} y={pad.t} width={bw} height={ih + pad.b} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
                {(data.length - 1 - i) % 7 === 0 && (
                  <text x={cx} y={H - 6} textAnchor="middle" fontSize="9" fill="#a39e92">{dayLabel(d.day)}</text>
                )}
              </g>
            );
          })}
        </svg>
        {hover != null && (
          <Tip xPct={((pad.l + bw * hover + bw / 2) / W) * 100} yPct={(Math.min(y(totals[hover]), pad.t + ih) / H) * 100}>
            <p className="font-medium text-ivory">{dayLabel(data[hover].day)} · {totals[hover]} lead{totals[hover] === 1 ? "" : "s"}</p>
            {KEYS.map((k) => (
              <p key={k} className="flex items-center gap-2 text-ivory-dim">
                <span className="h-2 w-2 rounded-sm" style={{ background: SOURCE[k].color }} />
                {SOURCE[k].short} {data[hover][k]}
              </p>
            ))}
          </Tip>
        )}
      </div>
      <details className="mt-2 text-xs text-stone">
        <summary className="cursor-pointer">Table view</summary>
        <table className="mt-2 w-full text-left">
          <thead><tr><th className="font-medium">Day</th>{KEYS.map((k) => <th key={k} className="font-medium">{SOURCE[k].short}</th>)}</tr></thead>
          <tbody>{data.filter((_, i) => totals[i]).map((d) => <tr key={d.day}><td>{dayLabel(d.day)}</td>{KEYS.map((k) => <td key={k}>{d[k]}</td>)}</tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

export function ResponseChart({ data, target = 5 }: { data: WeekRow[]; target?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 200, pad = { l: 40, r: 12, t: 12, b: 22 };
  const vals = data.map((d) => d.median).filter((v): v is number => v != null);
  const top = Math.max(target * 2, ...vals) * 1.15;
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (data.length > 1 ? (i / (data.length - 1)) * iw : iw / 2);
  const y = (v: number) => pad.t + ih - (v / top) * ih;
  const pts = data.map((d, i) => (d.median == null ? null : [x(i), y(d.median)] as const));
  const segs: string[] = [];
  let cur = "";
  pts.forEach((p) => { if (!p) { if (cur) segs.push(cur); cur = ""; } else cur += `${cur ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`; });
  if (cur) segs.push(cur);
  const ticks = [0, top / 3, (2 * top) / 3, top].map((v) => Math.round(v));
  const wk = (d: string) => `wk of ${dayLabel(d)}`;

  return (
    <figure className="relative">
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Median first response time per week" onMouseLeave={() => setHover(null)}>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#fff" strokeOpacity={i ? 0.06 : 0.14} />
              <text x={pad.l - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize="9" fill="#a39e92">{t}m</text>
            </g>
          ))}
          <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} stroke="#8fc79a" strokeOpacity={0.6} strokeDasharray="4 4" />
          <text x={W - pad.r} y={y(target) - 5} textAnchor="end" fontSize="9" fill="#c3c2b7">{target}-minute goal</text>
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#fff" strokeOpacity={0.25} />}
          {segs.map((d, i) => <path key={i} d={d} fill="none" stroke="#e2c27f" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
          {pts.map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 5 : 4} fill="#e2c27f" stroke="#000" strokeWidth={2} />)}
          {data.map((d, i) => (
            <g key={d.week}>
              <rect x={x(i) - iw / data.length / 2} y={pad.t} width={iw / data.length} height={ih + pad.b} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
              {(data.length - 1 - i) % 2 === 0 && <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#a39e92">{dayLabel(d.week)}</text>}
            </g>
          ))}
        </svg>
        {hover != null && (
          <Tip xPct={(x(hover) / W) * 100} yPct={((pts[hover] ? pts[hover]![1] : pad.t + ih / 2) / H) * 100}>
            <p className="font-medium text-ivory">{wk(data[hover].week)}</p>
            <p className="text-ivory-dim">{data[hover].median == null ? "No responses" : `Median ${mins(data[hover].median!)} · ${data[hover].count} lead${data[hover].count === 1 ? "" : "s"}`}</p>
          </Tip>
        )}
      </div>
      <details className="mt-2 text-xs text-stone">
        <summary className="cursor-pointer">Table view</summary>
        <table className="mt-2 w-full text-left">
          <thead><tr><th className="font-medium">Week</th><th className="font-medium">Median</th><th className="font-medium">Leads</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.week}><td>{dayLabel(d.week)}</td><td>{d.median == null ? "—" : mins(d.median)}</td><td>{d.count}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

/** Tiny trend line for stat tiles (no axes, no tooltip: the tile's number is the reading). */
export function Sparkline({ values, color = "#e2c27f" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const W = 120, H = 32, max = Math.max(1, ...values);
  const p = values.map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * W).toFixed(1)} ${(H - 2 - (v / max) * (H - 4)).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-28" aria-hidden="true">
      <path d={`${p}L${W} ${H}L0 ${H}Z`} fill={color} fillOpacity={0.12} />
      <path d={p} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}
