/**
 * Default values for the `config` table. EVERY number here is a placeholder
 * until a human verifies it (see docs/VERIFY.md). The seed marks them all
 * verified_at = null so the app shows "unverified" warnings.
 */

export interface CostConfig {
  mpf_rate: number;
  mpf_min_usd: number;
  mpf_max_usd: number;
  hmf_rate: number;
  customs_broker_flat_usd: number;
  air_rate_per_kg_usd: number;
  express_rate_per_kg_usd: number;
  sea_rate_per_cbm_usd: number;
  origin_fees_flat_usd: number;
  /** Sum of China-specific additional duties (Section 301 etc). MUST be verified per HTS. */
  china_additional_rate_total: number;
  /** Base MFN duty by 2-digit HTS chapter; falls back to default_base_rate. */
  base_rates: Record<string, number>;
  default_base_rate: number;
  fulfillment_per_order_usd: number;
  packaging_per_order_usd: number;
  payment_fee_rate: number;
  payment_fee_fixed_usd: number;
  est_cpa_default_usd: number;
  cny_per_usd: number;
}

export interface TimingConfig {
  transit_days: Record<"air" | "express" | "sea", [number, number]>;
  customs_days: [number, number];
  sample_days: number;
  /** MM-DD, goods landed in Utah */
  christmas_cutoff: string;
}

export interface ScorecardConfig {
  gates: { min_margin_multiple: number; block_compliance_blocked: boolean; block_ip_high: boolean };
  weights: {
    margin: number;
    demo: number;
    christmas: number;
    air_friendly: number;
    competition: number;
    private_label: number;
    compliance: number;
    giftable: number;
  };
  heat_bonus_max: number;
  shortlist_must_test_votes: number;
  review_min_score: number;
}

export interface KillRule {
  metric: "ctr" | "cost_per_signup_cents" | "cost_per_preorder_cents" | "cpc_cents";
  op: "<" | ">";
  value?: number;
  /** e.g. "0.5*gross_margin_cents" */
  value_expr?: string;
  after_spend_cents?: number;
  min_events?: number;
}
export interface KillRules {
  min_spend_before_judging_cents: number;
  kill_if: KillRule[];
  scale_if: KillRule[];
  max_days: number;
}

export const DEFAULT_COST: CostConfig = {
  mpf_rate: 0.003464,
  mpf_min_usd: 33,
  mpf_max_usd: 651,
  hmf_rate: 0.00125,
  customs_broker_flat_usd: 150,
  air_rate_per_kg_usd: 8,
  express_rate_per_kg_usd: 10,
  sea_rate_per_cbm_usd: 250,
  origin_fees_flat_usd: 100,
  china_additional_rate_total: 0.3,
  base_rates: {},
  default_base_rate: 0.04,
  fulfillment_per_order_usd: 4,
  packaging_per_order_usd: 0.75,
  payment_fee_rate: 0.029,
  payment_fee_fixed_usd: 0.3,
  est_cpa_default_usd: 15,
  cny_per_usd: 7.1,
};

export const DEFAULT_TIMING: TimingConfig = {
  transit_days: { air: [7, 12], express: [4, 7], sea: [30, 45] },
  customs_days: [3, 5],
  sample_days: 10,
  christmas_cutoff: "12-10",
};

export const DEFAULT_SCORECARD: ScorecardConfig = {
  gates: { min_margin_multiple: 3, block_compliance_blocked: true, block_ip_high: true },
  weights: {
    margin: 20,
    demo: 15,
    christmas: 15,
    air_friendly: 10,
    competition: 15,
    private_label: 10,
    compliance: 10,
    giftable: 5,
  },
  heat_bonus_max: 10,
  shortlist_must_test_votes: 2,
  review_min_score: 50,
};

export const DEFAULT_KILL_RULES: KillRules = {
  min_spend_before_judging_cents: 3000,
  kill_if: [
    { metric: "ctr", op: "<", value: 0.008, after_spend_cents: 3000 },
    { metric: "cost_per_signup_cents", op: ">", value: 300, after_spend_cents: 4000 },
    { metric: "cost_per_preorder_cents", op: ">", value_expr: "0.5*gross_margin_cents", after_spend_cents: 5000 },
  ],
  scale_if: [{ metric: "cost_per_preorder_cents", op: "<", value_expr: "0.3*gross_margin_cents", min_events: 3 }],
  max_days: 7,
};

export const DEFAULT_VETTING_CHECKLIST: { key: string; label: string }[] = [
  { key: "license", label: "Business license seen; company name matches invoice" },
  { key: "factory", label: "Factory vs trading company confirmed (visit, video call, or license scope)" },
  { key: "payment", label: "Payment via Trade Assurance or a COMPANY account matching the license (never personal)" },
  { key: "sample", label: "Sample received and approved (photos saved)" },
  { key: "pi", label: "Spec sheet + Proforma Invoice signed (specs, packaging, lead time, penalties)" },
  { key: "qc", label: "Third-party pre-shipment QC inspection booked" },
  { key: "certs", label: "Certification documents received (if compliance risk is not 'none')" },
];

export const FAIR_PHASES_PLACEHOLDER = [
  { phase: 1, start: "2026-10-15", end: "2026-10-19", categories: "electronics, appliances, hardware, tools, lighting" },
  { phase: 2, start: "2026-10-23", end: "2026-10-27", categories: "consumer goods, home decor, kitchenware, gifts" },
  { phase: 3, start: "2026-10-31", end: "2026-11-04", categories: "apparel, shoes, bags, toys, kids/baby, personal care, health, pet, office" },
];

/** Every config key the app knows about, with defaults. Used by the seed generator. */
export const CONFIG_DEFAULTS: Record<string, { value: unknown; note: string }> = {
  cost: { value: DEFAULT_COST, note: "Landed cost rates. VERIFY tariffs and freight before trusting margins." },
  timing: { value: DEFAULT_TIMING, note: "Transit/customs day ranges and Christmas cutoff." },
  scorecard: { value: DEFAULT_SCORECARD, note: "Winner scorecard gates + weights." },
  kill_rules_default: { value: DEFAULT_KILL_RULES, note: "Default ad test kill/scale rules." },
  vetting_checklist: { value: DEFAULT_VETTING_CHECKLIST, note: "Must be complete before stage=ordered." },
  fair_phases: { value: FAIR_PHASES_PLACEHOLDER, note: "PLACEHOLDER pattern. Verify at cantonfair.org.cn." },
  meta_daily_budget_cents: { value: 1000, note: "$10/day per product test." },
  company: {
    value: { name: "Your Company LLC", buyer_names: "Mahdy, Shabab", ship_to: "Your address, Utah, USA", email: "you@example.com", wechat_id: "" },
    note: "Used in supplier follow-up messages (sample shipping address, who we are).",
  },
  tiktok_min_budgets: { value: { ad_group_daily_usd: 20, campaign_daily_usd: 50 }, note: "Last known; verify in TikTok Ads Manager." },
};
