import { describe, expect, it } from "vitest";
import { DEFAULT_KILL_RULES, evaluateKillRules, evalExpr } from "../src/index.ts";

const base = { spend_cents: 0, impressions: 0, clicks: 0, waitlist_signups: 0, preorders: 0, days_running: 1 };

describe("kill rules", () => {
  it("too early", () => {
    expect(evaluateKillRules({ ...base, spend_cents: 1000 }, DEFAULT_KILL_RULES, 1500, "waitlist").recommendation).toBe("keep");
  });
  it("kills on low CTR", () => {
    const r = evaluateKillRules({ ...base, spend_cents: 3500, impressions: 10000, clicks: 50, waitlist_signups: 20 }, DEFAULT_KILL_RULES, 1500, "waitlist");
    expect(r.recommendation).toBe("kill");
    expect(r.reasons[0]).toContain("ctr");
  });
  it("kills waitlist when signups are too expensive", () => {
    const r = evaluateKillRules({ ...base, spend_cents: 4500, impressions: 5000, clicks: 100, waitlist_signups: 5 }, DEFAULT_KILL_RULES, 1500, "waitlist");
    expect(r.recommendation).toBe("kill");
    expect(r.reasons.join()).toContain("cost_per_signup");
  });
  it("scales preorder when cheap", () => {
    const r = evaluateKillRules({ ...base, spend_cents: 4000, impressions: 5000, clicks: 100, preorders: 10 }, DEFAULT_KILL_RULES, 2000, "preorder");
    // cpp = 400 < 0.3*2000 = 600
    expect(r.recommendation).toBe("scale");
  });
  it("kills preorder with zero sales after 50", () => {
    const r = evaluateKillRules({ ...base, spend_cents: 5000, impressions: 5000, clicks: 100 }, DEFAULT_KILL_RULES, 2000, "preorder");
    expect(r.recommendation).toBe("kill");
  });
  it("max days", () => {
    const r = evaluateKillRules({ ...base, spend_cents: 3500, impressions: 3000, clicks: 60, waitlist_signups: 30, days_running: 7 }, DEFAULT_KILL_RULES, 1500, "waitlist");
    expect(r.recommendation).toBe("kill");
  });
  it("expressions", () => {
    expect(evalExpr("0.5*gross_margin_cents", { gross_margin_cents: 1000 })).toBe(500);
    expect(evalExpr("300", { gross_margin_cents: 1 })).toBe(300);
    expect(() => evalExpr("rm -rf", { gross_margin_cents: 1 })).toThrow();
  });
});
