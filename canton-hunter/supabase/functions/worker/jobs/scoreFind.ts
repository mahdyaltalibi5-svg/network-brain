import { rankKey, scoreFind as coreScore, type CostOverrides } from "@core";
import { loadConfig } from "../../_shared/config.ts";
import { db, must, nowIso, type Row } from "../../_shared/db.ts";

export async function scoreFind(payload: { find_id: string }): Promise<Row> {
  const sb = db();
  const find = must(await sb.from("finds").select("*").eq("id", payload.find_id).single(), "find") as Row;
  const research = (await sb.from("research").select("*").eq("find_id", find.id).maybeSingle()).data as Row | null;
  const votes = must(await sb.from("votes").select("value").eq("find_id", find.id).is("deleted_at", null), "votes") as Row[];
  const calc = (await sb.from("cost_calcs").select("*").eq("find_id", find.id).maybeSingle()).data as Row | null;
  const cfg = await loadConfig();

  const r = coreScore(find as never, research as never, votes.map((v) => v.value), cfg, (calc?.inputs ?? {}) as CostOverrides);

  must(await sb.from("scores").upsert({
    find_id: find.id,
    total: r.score.total,
    rank_key: rankKey(r.score),
    breakdown: r.score.breakdown,
    gates_failed: r.score.gates_failed,
    margin_multiple: r.cost?.margin_multiple ?? null,
    arrive_by: r.cost?.arrive_by ?? null,
    computed_at: nowIso(),
    updated_at: nowIso(),
  }, { onConflict: "find_id" }), "upsert score");

  if (r.cost) {
    must(await sb.from("cost_calcs").upsert({
      id: calc?.id ?? find.id, // one row per find; id = find id so phones and server never create two
      find_id: find.id,
      inputs: calc?.inputs ?? {},
      outputs: { ...r.cost, input: r.costInput },
      config_snapshot: { cost: cfg.cost, timing: cfg.timing },
      computed_at: nowIso(),
    }, { onConflict: "find_id" }), "upsert cost calc");
  }

  // Auto-shortlist when enough "must test" votes.
  const mustTest = votes.filter((v) => v.value === 2).length;
  if (find.stage === "found" && mustTest >= cfg.scorecard.shortlist_must_test_votes) {
    must(await sb.from("finds").update({ stage: "shortlisted" }).eq("id", find.id), "shortlist");
    must(await sb.from("pipeline_events").insert({
      id: crypto.randomUUID(), find_id: find.id, from_stage: "found", to_stage: "shortlisted", note: `Auto: ${mustTest} must-test votes`,
    }), "pipeline event");
  }
  return { total: r.score.total, gates: r.score.gates_failed };
}
