import type { CostConfig, ScorecardConfig, TimingConfig } from "./config.ts";
import { landedCost, toUsd, type LandedCostInput, type LandedCostOutput } from "./landedCost.ts";
import { score, type ScoreResult } from "./scorecard.ts";
import type { Competition, ComplianceRisk, Find, FreightMode } from "./schemas.ts";
import { eff } from "./sync.ts";

export interface ResearchLite {
  retail_low_cents: number | null;
  retail_high_cents: number | null;
  competition: Competition | null;
  ip_risk: "low" | "med" | "high" | null;
}

export interface CostOverrides {
  mode?: FreightMode;
  qty?: number;
  retail_price_usd?: number;
  duty_rate_override?: number | null;
  est_cpa_usd?: number | null;
}

type FindLite = Pick<
  Find,
  | "fob_price_cents" | "fob_currency" | "moq" | "unit_weight_g" | "box_dims_mm" | "lead_time_days"
  | "hts_guess_ai" | "demo_score_ai" | "fragile" | "oem_logo" | "compliance_ai" | "compliance_override"
  | "giftable_ai" | "gut" | "stage"
>;

export function defaultRetailUsd(fobUsd: number, research: ResearchLite | null): { usd: number; guessed: boolean } {
  if (research?.retail_low_cents != null && research.retail_high_cents != null)
    return { usd: (research.retail_low_cents + research.retail_high_cents) / 200, guessed: false };
  if (research?.retail_low_cents != null) return { usd: research.retail_low_cents / 100, guessed: false };
  return { usd: Math.max(19.99, Math.round(fobUsd * 8) - 0.01), guessed: true };
}

/** Build landed-cost input from a find (+ overrides). Returns null if no FOB price yet. */
export function costInputForFind(
  f: FindLite,
  research: ResearchLite | null,
  cost: CostConfig,
  o: CostOverrides = {},
  today?: Date,
): LandedCostInput | null {
  if (f.fob_price_cents == null) return null;
  const fobUsd = toUsd(f.fob_price_cents / 100, f.fob_currency, cost);
  const retail = o.retail_price_usd ?? defaultRetailUsd(fobUsd, research).usd;
  const chapter = f.hts_guess_ai ? f.hts_guess_ai.replace(/\D/g, "").slice(0, 2) || null : null;
  return {
    fob_unit_usd: fobUsd,
    qty: o.qty ?? Math.max(f.moq ?? 500, 1),
    unit_weight_g: f.unit_weight_g,
    unit_dims_mm: f.box_dims_mm,
    mode: o.mode ?? "air",
    retail_price_usd: retail,
    est_cpa_usd: o.est_cpa_usd ?? null,
    hts_chapter: chapter,
    duty_rate_override: o.duty_rate_override ?? null,
    sample_in_hand: ["sample_in_hand", "testing", "negotiating", "vetting", "ordered", "qc", "shipped", "landed"].includes(f.stage),
    lead_time_days: f.lead_time_days,
    today,
  };
}

export function scoreFind(
  f: FindLite,
  research: ResearchLite | null,
  votes: number[],
  cfg: { cost: CostConfig; timing: TimingConfig; scorecard: ScorecardConfig },
  overrides: CostOverrides = {},
  today?: Date,
): { cost: LandedCostOutput | null; costInput: LandedCostInput | null; score: ScoreResult } {
  const input = costInputForFind(f, research, cfg.cost, overrides, today);
  const cost = input ? landedCost(input, cfg.cost, cfg.timing) : null;
  const compliance = eff(f.compliance_override, f.compliance_ai);
  const s = score(
    {
      margin_multiple: cost?.margin_multiple ?? null,
      demo_score: f.demo_score_ai,
      arrive_by: cost?.arrive_by ?? null,
      unit_weight_g: f.unit_weight_g,
      box_dims_mm: f.box_dims_mm,
      fragile: f.fragile,
      competition: research?.competition ?? null,
      oem_logo: f.oem_logo,
      compliance_risk: (compliance?.risk as ComplianceRisk | undefined) ?? null,
      ip_risk: research?.ip_risk ?? null,
      giftable: f.giftable_ai,
      gut: f.gut,
      votes,
      today,
    },
    cfg.scorecard,
    cfg.timing,
  );
  return { cost, costInput: input, score: s };
}
