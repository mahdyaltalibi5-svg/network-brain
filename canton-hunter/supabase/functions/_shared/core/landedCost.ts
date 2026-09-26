import type { CostConfig, TimingConfig } from "./config.ts";
import type { FreightMode } from "./schemas.ts";

export interface LandedCostInput {
  fob_unit_usd: number;
  qty: number;
  unit_weight_g: number | null;
  /** unit (or retail box) dims in mm, [L, W, H] */
  unit_dims_mm: number[] | null;
  mode: FreightMode;
  retail_price_usd: number;
  est_cpa_usd?: number | null;
  hts_chapter?: string | null;
  /** Total duty rate override (base + China additional), e.g. 0.35 */
  duty_rate_override?: number | null;
  /** Whether a sample is already in hand (skips sample_days in arrive-by) */
  sample_in_hand?: boolean;
  lead_time_days?: number | null;
  today?: Date;
}

export interface LandedCostLine {
  label: string;
  per_unit_usd: number;
}

export interface LandedCostOutput {
  lines: LandedCostLine[];
  duty_rate: number;
  chargeable_kg_unit: number;
  landed_unit_usd: number;
  per_order_costs_usd: number;
  gross_margin_usd: number;
  margin_after_ads_usd: number;
  margin_multiple: number;
  breakeven_cpa_usd: number;
  breakeven_roas: number | null;
  arrive_by: string; // ISO date (latest estimate)
  arrive_by_earliest: string;
  warnings: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function chargeableKg(
  weight_g: number | null,
  dims_mm: number[] | null,
  mode: FreightMode,
): { kg: number; warnings: string[] } {
  const warnings: string[] = [];
  const actual = weight_g != null && weight_g > 0 ? weight_g / 1000 : null;
  let volumetric: number | null = null;
  if (dims_mm && dims_mm.length === 3 && dims_mm.every((d) => d > 0)) {
    const [l, w, h] = dims_mm.map((d) => d / 10) as [number, number, number]; // cm
    const divisor = mode === "express" ? 5000 : 6000;
    volumetric = (l * w * h) / divisor;
  }
  if (actual == null && volumetric == null) {
    warnings.push("No weight or size: freight is estimated at 0.5 kg per unit");
    return { kg: 0.5, warnings };
  }
  if (actual == null) warnings.push("No weight: using volumetric weight only");
  return { kg: Math.max(actual ?? 0, volumetric ?? 0), warnings };
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

export function arriveBy(
  timing: TimingConfig,
  mode: FreightMode,
  lead_time_days: number | null | undefined,
  sample_in_hand: boolean,
  today: Date,
): { earliest: Date; latest: Date } {
  const lead = lead_time_days ?? 20;
  const sample = sample_in_hand ? 0 : timing.sample_days;
  const [tMin, tMax] = timing.transit_days[mode];
  const [cMin, cMax] = timing.customs_days;
  return {
    earliest: addDays(today, sample + lead + tMin + cMin),
    latest: addDays(today, sample + lead + tMax + cMax),
  };
}

/** The Christmas cutoff date that applies to `today` (this year, or next year if already past). */
export function christmasCutoff(timing: TimingConfig, today: Date): Date {
  const [mm, dd] = timing.christmas_cutoff.split("-").map(Number) as [number, number];
  let c = new Date(Date.UTC(today.getUTCFullYear(), mm - 1, dd));
  if (c.getTime() < today.getTime() - 30 * 86400_000) c = new Date(Date.UTC(today.getUTCFullYear() + 1, mm - 1, dd));
  return c;
}

export function landedCost(input: LandedCostInput, cost: CostConfig, timing: TimingConfig): LandedCostOutput {
  const warnings: string[] = [];
  const qty = Math.max(1, Math.floor(input.qty));
  const fob = input.fob_unit_usd;

  const { kg, warnings: kgWarn } = chargeableKg(input.unit_weight_g, input.unit_dims_mm, input.mode);
  warnings.push(...kgWarn);

  let freightUnit: number;
  if (input.mode === "sea") {
    const dims = input.unit_dims_mm;
    let cbm: number;
    if (dims && dims.length === 3 && dims.every((d) => d > 0)) {
      cbm = dims.reduce((a, d) => a * (d / 1000), 1);
    } else {
      cbm = 0.003;
      warnings.push("No size: sea freight is estimated at 0.003 m³ per unit");
    }
    freightUnit = cost.sea_rate_per_cbm_usd * cbm;
  } else {
    const rate = input.mode === "express" ? cost.express_rate_per_kg_usd : cost.air_rate_per_kg_usd;
    freightUnit = rate * kg;
  }
  const originUnit = cost.origin_fees_flat_usd / qty;

  const chapter = input.hts_chapter ?? null;
  const baseRate = chapter && cost.base_rates[chapter] != null ? cost.base_rates[chapter]! : cost.default_base_rate;
  if (!chapter || cost.base_rates[chapter] == null) warnings.push("Base duty rate is the default. Check the HTS code.");
  const dutyRate = input.duty_rate_override ?? baseRate + cost.china_additional_rate_total;

  const customsValue = fob * qty;
  const duty = customsValue * dutyRate;
  const mpf = Math.min(cost.mpf_max_usd, Math.max(cost.mpf_min_usd, customsValue * cost.mpf_rate));
  const hmf = input.mode === "sea" ? customsValue * cost.hmf_rate : 0;
  const broker = cost.customs_broker_flat_usd;

  const lines: LandedCostLine[] = [
    { label: "FOB unit price", per_unit_usd: fob },
    { label: `Freight (${input.mode})`, per_unit_usd: freightUnit },
    { label: "Origin fees", per_unit_usd: originUnit },
    { label: `Duty (${(dutyRate * 100).toFixed(1)}%)`, per_unit_usd: duty / qty },
    { label: "MPF", per_unit_usd: mpf / qty },
  ];
  if (hmf > 0) lines.push({ label: "HMF", per_unit_usd: hmf / qty });
  lines.push({ label: "Customs broker", per_unit_usd: broker / qty });

  const landedUnit = lines.reduce((a, l) => a + l.per_unit_usd, 0);
  const retail = input.retail_price_usd;
  const perOrder =
    cost.fulfillment_per_order_usd +
    cost.packaging_per_order_usd +
    cost.payment_fee_rate * retail +
    cost.payment_fee_fixed_usd;
  const gross = retail - landedUnit - perOrder;
  const cpa = input.est_cpa_usd ?? cost.est_cpa_default_usd;

  const today = input.today ?? new Date();
  const ab = arriveBy(timing, input.mode, input.lead_time_days, input.sample_in_hand ?? false, today);
  if (input.lead_time_days == null) warnings.push("No lead time: assuming 20 days");

  return {
    lines: lines.map((l) => ({ ...l, per_unit_usd: round2(l.per_unit_usd) })),
    duty_rate: dutyRate,
    chargeable_kg_unit: Math.round(kg * 1000) / 1000,
    landed_unit_usd: round2(landedUnit),
    per_order_costs_usd: round2(perOrder),
    gross_margin_usd: round2(gross),
    margin_after_ads_usd: round2(gross - cpa),
    margin_multiple: landedUnit > 0 ? round2(retail / landedUnit) : 0,
    breakeven_cpa_usd: round2(gross),
    breakeven_roas: gross > 0 ? round2(retail / gross) : null,
    arrive_by: ab.latest.toISOString().slice(0, 10),
    arrive_by_earliest: ab.earliest.toISOString().slice(0, 10),
    warnings,
  };
}

/** Convert a price in a given currency to USD using config. */
export function toUsd(amount: number, currency: string | null | undefined, cost: CostConfig): number {
  const c = (currency ?? "USD").toUpperCase();
  if (c === "CNY" || c === "RMB") return amount / cost.cny_per_usd;
  return amount;
}
