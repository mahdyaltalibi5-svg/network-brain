import { describe, expect, it } from "vitest";
import { DEFAULT_SCORECARD, DEFAULT_TIMING, heatBonus, marginScore, score, rankKey, airFriendlyScore, type ScoreInput } from "../src/index.ts";

const today = new Date("2026-11-01T00:00:00Z");
const good: ScoreInput = {
  margin_multiple: 5, demo_score: 5, arrive_by: "2026-11-25", unit_weight_g: 200, box_dims_mm: [100, 100, 50],
  fragile: false, competition: "low", oem_logo: true, compliance_risk: "none", ip_risk: "low", giftable: true,
  gut: null, votes: [], today,
};

describe("scorecard", () => {
  it("margin curve", () => {
    expect(marginScore(1)).toBe(0);
    expect(marginScore(3)).toBe(5);
    expect(marginScore(5)).toBe(10);
    expect(marginScore(9)).toBe(10);
    expect(marginScore(2)).toBe(2.5);
  });
  it("perfect product scores 100 with no gates", () => {
    const r = score(good, DEFAULT_SCORECARD, DEFAULT_TIMING);
    expect(r.base).toBe(100);
    expect(r.gates_failed).toEqual([]);
  });
  it("unknowns count as neutral 5", () => {
    const r = score({ ...good, competition: null }, DEFAULT_SCORECARD, DEFAULT_TIMING);
    expect(r.breakdown.find((b) => b.key === "competition")).toMatchObject({ score: 5, unknown: true });
    expect(r.base).toBeCloseTo(100 - ((15 * 5) / 100) * 10, 1);
  });
  it("gates", () => {
    const r = score({ ...good, margin_multiple: 2.5, compliance_risk: "blocked", ip_risk: "high" }, DEFAULT_SCORECARD, DEFAULT_TIMING);
    expect(r.gates_failed).toHaveLength(3);
    expect(rankKey(r)).toBeLessThan(0);
  });
  it("christmas: late arrival scores 0", () => {
    const r = score({ ...good, arrive_by: "2027-01-05" }, DEFAULT_SCORECARD, DEFAULT_TIMING);
    expect(r.breakdown.find((b) => b.key === "christmas")!.score).toBe(0);
    const r2 = score({ ...good, arrive_by: "2026-12-08" }, DEFAULT_SCORECARD, DEFAULT_TIMING);
    expect(r2.breakdown.find((b) => b.key === "christmas")!.score).toBe(7);
  });
  it("heat bonus", () => {
    expect(heatBonus("fire", [2, 2, 1], 10)).toBe(9);
    expect(heatBonus("fire", [2, 2, 2], 10)).toBe(10);
    expect(heatBonus(null, [-1, -1], 10)).toBe(0);
  });
  it("air friendly", () => {
    expect(airFriendlyScore(null, null, null)).toBeNull();
    expect(airFriendlyScore(3000, [500, 400, 300], true)).toBe(0);
    expect(airFriendlyScore(300, [100, 100, 100], false)).toBe(10);
  });
});
