import { describe, expect, it } from "vitest";
import { DEFAULT_COST, DEFAULT_TIMING, chargeableKg, landedCost, christmasCutoff } from "../src/index.ts";

const today = new Date("2026-11-01T00:00:00Z");
const cost = { ...DEFAULT_COST, base_rates: { "94": 0.039 } };

describe("chargeableKg", () => {
  it("uses the larger of actual and volumetric weight", () => {
    // 30x20x10cm = 6000 cm³ / 6000 = 1kg volumetric vs 0.4kg actual
    expect(chargeableKg(400, [300, 200, 100], "air").kg).toBeCloseTo(1.0);
    expect(chargeableKg(1500, [300, 200, 100], "air").kg).toBeCloseTo(1.5);
    // express divisor 5000 -> 1.2
    expect(chargeableKg(400, [300, 200, 100], "express").kg).toBeCloseTo(1.2);
  });
  it("falls back with warning", () => {
    const r = chargeableKg(null, null, "air");
    expect(r.kg).toBe(0.5);
    expect(r.warnings.length).toBe(1);
  });
});

describe("landedCost", () => {
  it("air golden case", () => {
    const r = landedCost(
      { fob_unit_usd: 2.1, qty: 500, unit_weight_g: 300, unit_dims_mm: [150, 100, 80], mode: "air",
        retail_price_usd: 29.99, hts_chapter: "94", lead_time_days: 15, today },
      cost, DEFAULT_TIMING);
    // freight: max(0.3, 15*10*8/6000=0.2) = 0.3kg * $8 = 2.40
    // origin: 100/500 = 0.20
    // duty: 2.1 * (0.039+0.3) = 0.7119
    // mpf: customs 1050*0.003464=3.64 -> min 33 -> /500 = 0.066
    // broker: 150/500 = 0.30
    // landed = 2.1+2.4+0.2+0.7119+0.066+0.3 = 5.7779
    expect(r.landed_unit_usd).toBeCloseTo(5.78, 2);
    // per order: 4 + 0.75 + 0.029*29.99 + 0.3 = 5.9197
    expect(r.per_order_costs_usd).toBeCloseTo(5.92, 2);
    expect(r.gross_margin_usd).toBeCloseTo(29.99 - 5.7779 - 5.9197, 1);
    expect(r.margin_multiple).toBeCloseTo(29.99 / 5.7779, 1);
    expect(r.margin_after_ads_usd).toBeCloseTo(r.gross_margin_usd - 15, 1);
    // arrive: sample 10 + lead 15 + air 12 + customs 5 = 42 days after Nov 1 -> Dec 13
    expect(r.arrive_by).toBe("2026-12-13");
    expect(r.arrive_by_earliest).toBe("2026-12-06"); // 10+15+7+3 = 35 days
  });

  it("sea case adds HMF and uses CBM", () => {
    const r = landedCost(
      { fob_unit_usd: 5, qty: 1000, unit_weight_g: 800, unit_dims_mm: [400, 300, 200], mode: "sea",
        retail_price_usd: 39.99, hts_chapter: "94", lead_time_days: 20, today },
      cost, DEFAULT_TIMING);
    const cbm = 0.4 * 0.3 * 0.2; // 0.024
    const hmf = 5000 * 0.00125 / 1000;
    const mpf = Math.min(651, Math.max(33, 5000 * 0.003464)) / 1000;
    const expected = 5 + 250 * cbm + 0.1 + 5 * 0.339 + mpf + hmf + 0.15;
    expect(r.landed_unit_usd).toBeCloseTo(expected, 2);
    expect(r.lines.some((l) => l.label === "HMF")).toBe(true);
  });

  it("duty override wins and missing chapter warns", () => {
    const r = landedCost(
      { fob_unit_usd: 1, qty: 100, unit_weight_g: 100, unit_dims_mm: null, mode: "air",
        retail_price_usd: 20, duty_rate_override: 0.5, today },
      cost, DEFAULT_TIMING);
    expect(r.duty_rate).toBe(0.5);
    expect(r.warnings.some((w) => w.includes("HTS"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("lead time"))).toBe(true);
  });

  it("MPF is capped at max", () => {
    const r = landedCost(
      { fob_unit_usd: 100, qty: 10000, unit_weight_g: 100, unit_dims_mm: null, mode: "air", retail_price_usd: 500, hts_chapter: "94", today },
      cost, DEFAULT_TIMING);
    expect(r.lines.find((l) => l.label === "MPF")!.per_unit_usd).toBeCloseTo(651 / 10000, 2);
  });
});

describe("christmasCutoff", () => {
  it("uses this year's Dec 10 in the fall and next year's in late December", () => {
    expect(christmasCutoff(DEFAULT_TIMING, today).toISOString().slice(0, 10)).toBe("2026-12-10");
    expect(christmasCutoff(DEFAULT_TIMING, new Date("2026-12-20T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-12-10");
    expect(christmasCutoff(DEFAULT_TIMING, new Date("2027-02-01T00:00:00Z")).toISOString().slice(0, 10)).toBe("2027-12-10");
  });
});
