import type { ScorecardConfig, TimingConfig } from "./config.ts";
import { christmasCutoff } from "./landedCost.ts";
import type { Competition, ComplianceRisk, Gut } from "./schemas.ts";

export interface ScoreInput {
  margin_multiple: number | null;
  demo_score: number | null; // 1-5
  arrive_by: string | null; // ISO date
  unit_weight_g: number | null;
  box_dims_mm: number[] | null;
  fragile: boolean | null;
  competition: Competition | null;
  oem_logo: boolean | null;
  compliance_risk: ComplianceRisk | null;
  ip_risk: "low" | "med" | "high" | null;
  giftable: boolean | null;
  gut: Gut | null;
  votes: number[]; // -1..2
  today?: Date;
}

export interface ScoreBreakdownItem {
  key: string;
  label: string;
  score: number; // 0-10
  weight: number;
  unknown: boolean;
}

export interface ScoreResult {
  total: number; // 0-100 (+ heat bonus, capped at 110)
  base: number;
  heat_bonus: number;
  breakdown: ScoreBreakdownItem[];
  gates_failed: string[];
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** 3x -> 5, 5x+ -> 10, 1x -> 0, linear between. */
export function marginScore(mm: number): number {
  if (mm <= 1) return 0;
  if (mm <= 3) return ((mm - 1) / 2) * 5;
  return clamp(5 + ((mm - 3) / 2) * 5, 0, 10);
}

export function airFriendlyScore(weight_g: number | null, dims: number[] | null, fragile: boolean | null): number | null {
  if (weight_g == null && (!dims || dims.length !== 3) && fragile == null) return null;
  let s = 10;
  if (weight_g != null) {
    if (weight_g > 2000) s -= 6;
    else if (weight_g > 1000) s -= 4;
    else if (weight_g > 500) s -= 2;
  }
  if (dims && dims.length === 3) {
    const vol = dims.reduce((a, d) => a * d, 1) / 1e6; // liters
    if (vol > 20) s -= 4;
    else if (vol > 8) s -= 2; // bigger than a shoebox
  }
  if (fragile) s -= 3;
  return clamp(s, 0, 10);
}

const COMPETITION_SCORE: Record<Competition, number> = { low: 10, med: 6, high: 3, saturated: 0 };
const COMPLIANCE_SCORE: Record<ComplianceRisk, number> = { none: 10, easy: 6, hard: 2, blocked: 0 };

export function heatBonus(gut: Gut | null, votes: number[], max: number): number {
  const gutPts = gut === "fire" ? 3 : gut === "good" ? 1 : 0;
  const votePts = votes.reduce((a, v) => a + (v === 2 ? 2.5 : v === 1 ? 1 : v === -1 ? -1.5 : 0), 0);
  return clamp(Math.round((gutPts + votePts) * 10) / 10, 0, max);
}

export function score(input: ScoreInput, cfg: ScorecardConfig, timing: TimingConfig): ScoreResult {
  const today = input.today ?? new Date();
  const w = cfg.weights;
  const items: ScoreBreakdownItem[] = [];
  const add = (key: string, label: string, s: number | null, weight: number) =>
    items.push({ key, label, score: s == null ? 5 : Math.round(clamp(s, 0, 10) * 10) / 10, weight, unknown: s == null });

  add("margin", "Margin multiple", input.margin_multiple == null ? null : marginScore(input.margin_multiple), w.margin);
  add("demo", "Wow in a 5-second video", input.demo_score == null ? null : ((clamp(input.demo_score, 1, 5) - 1) / 4) * 10, w.demo);

  let christmas: number | null = null;
  if (input.arrive_by) {
    const cutoff = christmasCutoff(timing, today);
    const arrive = new Date(input.arrive_by + "T00:00:00Z");
    const slackDays = (cutoff.getTime() - arrive.getTime()) / 86400_000;
    christmas = slackDays >= 7 ? 10 : slackDays >= 0 ? 7 : slackDays >= -7 ? 3 : 0;
  }
  add("christmas", "Arrives before Christmas cutoff", christmas, w.christmas);
  add("air_friendly", "Small, light, not fragile", airFriendlyScore(input.unit_weight_g, input.box_dims_mm, input.fragile), w.air_friendly);
  add("competition", "Low competition", input.competition == null ? null : COMPETITION_SCORE[input.competition], w.competition);
  add("private_label", "Custom logo possible", input.oem_logo == null ? null : input.oem_logo ? 10 : 2, w.private_label);
  add("compliance", "Compliance ease", input.compliance_risk == null ? null : COMPLIANCE_SCORE[input.compliance_risk], w.compliance);
  add("giftable", "Giftable", input.giftable == null ? null : input.giftable ? 10 : 3, w.giftable);

  const totalW = items.reduce((a, i) => a + i.weight, 0) || 1;
  const base = Math.round((items.reduce((a, i) => a + i.score * i.weight, 0) / totalW) * 10 * 10) / 10;
  const bonus = heatBonus(input.gut, input.votes, cfg.heat_bonus_max);

  const gates: string[] = [];
  if (input.margin_multiple != null && input.margin_multiple < cfg.gates.min_margin_multiple)
    gates.push(`Margin ${input.margin_multiple.toFixed(1)}x is below ${cfg.gates.min_margin_multiple}x`);
  if (cfg.gates.block_compliance_blocked && input.compliance_risk === "blocked") gates.push("Compliance blocked");
  if (cfg.gates.block_ip_high && input.ip_risk === "high") gates.push("High IP / knockoff risk");

  return { total: Math.round((base + bonus) * 10) / 10, base, heat_bonus: bonus, breakdown: items, gates_failed: gates };
}

/** Sort key: gate failures always sink below passing finds. */
export function rankKey(r: Pick<ScoreResult, "total" | "gates_failed">): number {
  return r.gates_failed.length ? r.total - 1000 : r.total;
}
