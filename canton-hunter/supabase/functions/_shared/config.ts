import {
  CONFIG_DEFAULTS, type CostConfig, type KillRules, type ScorecardConfig, type TimingConfig,
} from "@core";
import { db, must, type Row } from "./db.ts";

export interface AppConfig {
  cost: CostConfig;
  timing: TimingConfig;
  scorecard: ScorecardConfig;
  kill_rules_default: KillRules;
  vetting_checklist: { key: string; label: string }[];
  meta_daily_budget_cents: number;
  // deno-lint-ignore no-explicit-any
  [k: string]: any;
}

/** Config rows merged over code defaults (shallow per key, so new default fields still apply). */
export async function loadConfig(): Promise<AppConfig> {
  const rows = must(await db().from("config").select("key,value").is("deleted_at", null), "load config") as Row[];
  const out: Row = {};
  for (const [k, d] of Object.entries(CONFIG_DEFAULTS)) out[k] = d.value;
  for (const r of rows) {
    const d = out[r.key];
    out[r.key] = d && typeof d === "object" && !Array.isArray(d) && typeof r.value === "object" && !Array.isArray(r.value)
      ? { ...d, ...r.value }
      : r.value;
  }
  return out as AppConfig;
}
