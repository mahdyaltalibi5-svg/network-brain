import type { KillRule, KillRules } from "./config.ts";
import type { Recommendation } from "./schemas.ts";

export interface LaunchTotals {
  spend_cents: number;
  impressions: number;
  clicks: number;
  waitlist_signups: number;
  preorders: number;
  days_running: number;
}

export interface KillEvaluation {
  recommendation: Recommendation;
  reasons: string[];
  metrics: Record<string, number | null>;
}

export function deriveMetrics(t: LaunchTotals): Record<KillRule["metric"], number | null> {
  return {
    ctr: t.impressions > 0 ? t.clicks / t.impressions : null,
    cpc_cents: t.clicks > 0 ? t.spend_cents / t.clicks : null,
    cost_per_signup_cents: t.waitlist_signups > 0 ? t.spend_cents / t.waitlist_signups : t.spend_cents > 0 ? Infinity : null,
    cost_per_preorder_cents: t.preorders > 0 ? t.spend_cents / t.preorders : t.spend_cents > 0 ? Infinity : null,
  };
}

/** Supports "<number>" or "<k>*gross_margin_cents". */
export function evalExpr(expr: string, vars: { gross_margin_cents: number }): number {
  const e = expr.replace(/\s+/g, "");
  const m = e.match(/^(\d+(?:\.\d+)?)\*gross_margin_cents$/);
  if (m) return Number(m[1]) * vars.gross_margin_cents;
  if (e === "gross_margin_cents") return vars.gross_margin_cents;
  const n = Number(e);
  if (Number.isFinite(n)) return n;
  throw new Error(`Unsupported kill rule expression: ${expr}`);
}

function eventsFor(metric: KillRule["metric"], t: LaunchTotals): number {
  if (metric === "cost_per_signup_cents") return t.waitlist_signups;
  if (metric === "cost_per_preorder_cents") return t.preorders;
  return t.clicks;
}

function fmt(metric: string, v: number): string {
  if (!Number.isFinite(v)) return "none yet";
  if (metric === "ctr") return `${(v * 100).toFixed(2)}%`;
  return `$${(v / 100).toFixed(2)}`;
}

/**
 * Pure evaluation. Never acts: the app only recommends; a human confirms any pause/scale.
 * `mode` limits which cost-per metrics apply (waitlist → signups, preorder → preorders).
 */
export function evaluateKillRules(
  t: LaunchTotals,
  rules: KillRules,
  gross_margin_cents: number,
  mode: "waitlist" | "preorder",
): KillEvaluation {
  const metrics = deriveMetrics(t);
  const reasons: string[] = [];
  const applies = (r: KillRule) =>
    !(mode === "waitlist" && r.metric === "cost_per_preorder_cents") &&
    !(mode === "preorder" && r.metric === "cost_per_signup_cents");
  const threshold = (r: KillRule) => (r.value_expr ? evalExpr(r.value_expr, { gross_margin_cents }) : (r.value ?? 0));
  const test = (r: KillRule) => {
    const v = metrics[r.metric];
    if (v == null) return false;
    const th = threshold(r);
    return r.op === "<" ? v < th : v > th;
  };

  if (t.spend_cents < rules.min_spend_before_judging_cents) {
    return { recommendation: "keep", reasons: [`Too early: $${(t.spend_cents / 100).toFixed(2)} spent`], metrics };
  }

  for (const r of rules.scale_if.filter(applies)) {
    if ((r.min_events ?? 0) <= eventsFor(r.metric, t) && test(r)) {
      reasons.push(`${r.metric} ${fmt(r.metric, metrics[r.metric]!)} ${r.op} ${fmt(r.metric, threshold(r))}`);
      return { recommendation: "scale", reasons, metrics };
    }
  }
  for (const r of rules.kill_if.filter(applies)) {
    if (t.spend_cents >= (r.after_spend_cents ?? 0) && test(r)) {
      reasons.push(`${r.metric} ${fmt(r.metric, metrics[r.metric]!)} ${r.op} ${fmt(r.metric, threshold(r))}`);
    }
  }
  if (reasons.length) return { recommendation: "kill", reasons, metrics };
  if (t.days_running >= rules.max_days) return { recommendation: "kill", reasons: [`Hit the ${rules.max_days}-day limit without winning`], metrics };
  return { recommendation: "keep", reasons: ["Within thresholds"], metrics };
}
