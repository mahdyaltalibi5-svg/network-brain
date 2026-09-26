import { describe, expect, it } from "vitest";
import { clampClientTime, lww, uuidv7, eff, scoreFind, DEFAULT_COST, DEFAULT_TIMING, DEFAULT_SCORECARD, FindExtraction } from "../src/index.ts";
import { z } from "zod";

describe("sync", () => {
  it("lww keeps newer and ties keep current", () => {
    const a = { id: "1", updated_at: "2026-10-29T01:00:00Z", v: "a" };
    const b = { id: "1", updated_at: "2026-10-29T02:00:00Z", v: "b" };
    expect(lww(a, b).v).toBe("b");
    expect(lww(b, a).v).toBe("b");
    expect(lww(a, { ...a, v: "c" }).v).toBe("a");
    expect(lww(undefined, a).v).toBe("a");
  });
  it("clamps future clocks", () => {
    const now = new Date("2026-10-29T00:00:00Z");
    expect(clampClientTime("2027-01-01T00:00:00Z", now)).toBe(now.toISOString());
    expect(clampClientTime("2026-10-29T05:00:00Z", now)).toBe("2026-10-29T05:00:00.000Z");
    expect(clampClientTime("garbage", now)).toBe(now.toISOString());
  });
  it("uuidv7 is valid and time ordered", () => {
    const a = uuidv7(1000), b = uuidv7(2000);
    expect(z.string().uuid().safeParse(a).success).toBe(true);
    expect(a[14]).toBe("7");
    expect(a < b).toBe(true);
  });
  it("eff", () => {
    expect(eff("h", "a")).toBe("h");
    expect(eff(null, "a")).toBe("a");
    expect(eff(undefined, undefined)).toBeNull();
  });
});

describe("scoreFind", () => {
  it("handles a CNY find without research", () => {
    const r = scoreFind(
      { fob_price_cents: 1500, fob_currency: "CNY", moq: 500, unit_weight_g: 300, box_dims_mm: [150, 100, 80], lead_time_days: 15,
        hts_guess_ai: "9405.49", demo_score_ai: 4, fragile: false, oem_logo: true, compliance_ai: { risk: "none", flags: [] },
        compliance_override: null, giftable_ai: true, gut: "fire", stage: "found" },
      null, [2], { cost: DEFAULT_COST, timing: DEFAULT_TIMING, scorecard: DEFAULT_SCORECARD }, {}, new Date("2026-11-01T00:00:00Z"));
    expect(r.cost).not.toBeNull();
    expect(r.costInput!.fob_unit_usd).toBeCloseTo(15 / 7.1, 3);
    expect(r.costInput!.hts_chapter).toBe("94");
    expect(r.score.total).toBeGreaterThan(50);
  });
  it("no price -> no cost, still scores", () => {
    const r = scoreFind(
      { fob_price_cents: null, fob_currency: null, moq: null, unit_weight_g: null, box_dims_mm: null, lead_time_days: null,
        hts_guess_ai: null, demo_score_ai: null, fragile: null, oem_logo: null, compliance_ai: null, compliance_override: null,
        giftable_ai: null, gut: null, stage: "found" },
      null, [], { cost: DEFAULT_COST, timing: DEFAULT_TIMING, scorecard: DEFAULT_SCORECARD });
    expect(r.cost).toBeNull();
    expect(r.score.base).toBe(50);
  });
});

describe("AI schemas", () => {
  it("can produce JSON schema", () => {
    const js = z.toJSONSchema(FindExtraction);
    expect(JSON.stringify(js)).toContain("supplier");
  });
});
