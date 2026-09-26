/**
 * WEB DEMO: stands in for the Supabase server. Uses the real core logic (landed cost, scorecard, kill rules,
 * product grouping) so numbers are real; only the AI text is canned. Writes go straight into the local store.
 */
import { assignProductGroup, DEFAULT_KILL_RULES, evaluateKillRules, parseBoothCode, rankKey, scoreFind, uuidv7 } from "@canton/core";
import { configFrom } from "../data";
import { all, applyServerRows, get, subscribe, type Row } from "../store";
import { DEMO_ME } from "./seed";

const now = () => new Date().toISOString();
const later = (ms: number, fn: () => void) => setTimeout(fn, ms);
const put = (t: string, row: Row) => applyServerRows(t, [{ deleted_at: null, created_at: now(), ...row, updated_at: now() }]);
// deno-lint-ignore no-explicit-any
type Args = Record<string, any>;
const title = (f: Row) => f.title_override ?? f.title_ai ?? "Product";

// ---------------- scoring (real core logic) ----------------
let writing = false;
export function rescoreAll() {
  const cfg = configFrom(all("config"));
  writing = true;
  try {
    for (const f of all("finds")) {
      const research = all("research").find((r) => r.find_id === f.id) ?? null;
      const votes = all("votes").filter((v) => v.find_id === f.id).map((v) => v.value as number);
      const calc = all("cost_calcs").find((c) => c.find_id === f.id);
      const r = scoreFind(f as never, research as never, votes, cfg, (calc?.inputs ?? {}) as never);
      const prev = all("scores").find((s) => s.find_id === f.id);
      put("scores", { id: prev?.id ?? `score-${f.id}`, find_id: f.id, total: r.score.total, rank_key: rankKey(r.score), breakdown: r.score.breakdown,
        gates_failed: r.score.gates_failed, margin_multiple: r.cost?.margin_multiple ?? null, arrive_by: r.cost?.arrive_by ?? null, computed_at: now() });
      if (r.cost) put("cost_calcs", { id: calc?.id ?? f.id, find_id: f.id, inputs: calc?.inputs ?? {}, outputs: { ...r.cost, input: r.costInput }, computed_at: now() });
      const mustTest = votes.filter((v) => v === 2).length;
      if (f.stage === "found" && mustTest >= cfg.scorecard.shortlist_must_test_votes) put("finds", { ...f, stage: "shortlisted" });
    }
  } finally {
    writing = false;
  }
}

// ---------------- simulated AI processing of new captures ----------------
function fakeExtract(f: Row) {
  const t = (f.transcript ?? "").toLowerCase();
  const price = t.match(/(\d+(?:\.\d+)?)\s*(rmb|yuan|dollars?|usd|\$)?/);
  const moq = t.match(/moq\s*(\d+)(k)?/);
  const lead = t.match(/(\d+)\s*(days?|weeks?)/);
  const n = all("finds").filter((x) => x.captured_by === DEMO_ME).length;
  const key = t.split(/[,.]/)[0]?.trim().split(" ").slice(0, 3).join(" ") || `demo capture ${n}`;
  const groupOthers = all("finds").filter((x) => x.id !== f.id).map((x) => ({ id: x.id, product_key_ai: x.product_key_ai, product_group_id: x.product_group_id }));
  put("finds", {
    ...f,
    title_ai: t ? key.replace(/\b\w/g, (c: string) => c.toUpperCase()) : `New find #${n}`,
    description_ai: "Demo: in the real app Claude writes this from the product photo, the business card and your voice note.",
    category_ai: "Demo category", tags_ai: key.split(" "), giftable_ai: true, demo_score_ai: 4, compliance_ai: { risk: "none", flags: [] },
    fob_price_cents: f.fob_price_cents ?? (price ? Math.round(Number(price[1]) * 100) : null),
    fob_currency: f.fob_currency ?? (price ? (/rmb|yuan/.test(price[2] ?? "") ? "CNY" : "USD") : null),
    moq: f.moq ?? (moq ? Number(moq[1]) * (moq[2] ? 1000 : 1) : null),
    lead_time_days: f.lead_time_days ?? (lead ? Number(lead[1]) * (lead[2]!.startsWith("week") ? 7 : 1) : null),
    booth_code: f.booth_code ?? parseBoothCode(t)?.booth ?? null,
    unit_weight_g: 250, box_dims_mm: [150, 100, 80], fragile: false,
    product_key_ai: key, product_group_id: f.product_group_id ?? assignProductGroup(key, groupOthers, uuidv7).groupId,
    processing_state: "done",
  });
  for (const m of all("media").filter((x) => x.find_id === f.id)) put("media", { ...m, upload_state: "uploaded" });
  rescoreAll();
}

// ---------------- job + RPC handlers ----------------
function research(findId: string) {
  const f = get("finds", findId);
  if (!f) return;
  const fob = (f.fob_price_cents ?? 300) / 100 * (f.fob_currency === "CNY" ? 1 / 7.1 : 1);
  const lo = Math.max(9, Math.round(fob * 6)), hi = Math.round(lo * 1.6);
  put("research", {
    id: all("research").find((r) => r.find_id === findId)?.id ?? `research-${findId}`, find_id: findId, status: "done",
    retail_low_cents: lo * 100, retail_high_cents: hi * 100, competition: "med", ip_risk: "low",
    summary: `Demo research: similar items sell for $${lo}–$${hi}. In the real app Claude searches Amazon, TikTok Shop and 1688 and cites links.`,
    report: { comparables: [], retail_low_usd: lo, retail_high_usd: hi, competition: "med", competition_notes: "demo", trend_notes: "Demo trend notes.", cheaper_source_found: false, cheaper_source_notes: null, ip_risk: "low", ip_notes: "demo", summary: "demo" },
    sources: [{ platform: "Amazon", title: `${title(f)} (similar)`, url: "https://www.amazon.com/", price_usd: hi }], model: "demo",
  });
  rescoreAll();
}

function draftFollowup(payload: Args) {
  const s = get("suppliers", payload.supplier_id);
  if (!s) return;
  const finds = all("finds").filter((f) => f.supplier_id === s.id && f.stage !== "killed");
  const names = finds.map(title).join("、");
  const row = {
    id: payload.followup_id ?? uuidv7(), supplier_id: s.id, find_ids: finds.map((f) => f.id), channel: "wechat", purpose: payload.purpose ?? "quote",
    subject: `${names} – follow-up`, status: "draft", asks: ["Price at MOQ and 5x MOQ", "Lead time", "Logo/packaging cost", "Carton size and weight"],
    body_zh: `${s.contact_name ?? ""}您好！我们是在广交会${s.booth_code ?? ""}展位认识的美国买家。我们对${names}很感兴趣。\n\n想确认：\n1. 起订量和5倍起订量的FOB价格\n2. 交货期\n3. 定制logo和包装的费用\n4. 外箱尺寸和重量\n\n谢谢！（演示草稿：真实应用里由AI根据具体产品撰写）`,
    body_en: `Hi ${s.contact_name ?? ""}! We're the US buyers you met at Canton Fair booth ${s.booth_code ?? ""}. We're interested in: ${finds.map(title).join(", ")}.\n\nCould you confirm:\n1. FOB price at MOQ and 5x MOQ\n2. Lead time\n3. Logo and packaging cost\n4. Carton size and weight\n\nThank you! (Demo draft: the real app has Claude write it for the exact products.)`,
  };
  const prev = payload.followup_id ? get("followups", payload.followup_id) : undefined;
  put("followups", { ...(prev ?? {}), ...row });
}

function draftAllFollowups() {
  const active = ["shortlisted", "quote_requested", "quote_received", "sample_requested", "sample_in_hand", "testing", "negotiating"];
  const has = new Set(all("followups").map((f) => f.supplier_id));
  for (const sid of new Set(all("finds").filter((f) => f.supplier_id && active.includes(f.stage)).map((f) => f.supplier_id as string))) {
    if (!has.has(sid)) draftFollowup({ supplier_id: sid });
  }
}

function launchAction(id: string, action: string): string | null {
  const l = get("launches", id);
  if (!l) return "launch not found";
  const f = get("finds", l.find_id)!;
  switch (action) {
    case "plan": {
      put("launches", { ...l, status: "planning" });
      const price = Math.max(19.99, Math.round(((f.fob_price_cents ?? 300) / 100) * 9) - 0.01);
      later(1800, () => put("launches", { ...get("launches", id)!, status: "plan_ready", mode: "waitlist", price_cents: Math.round(price * 100),
        ship_by_date: new Date(Date.now() + 45 * 86400_000).toISOString().slice(0, 10), kill_rules: DEFAULT_KILL_RULES,
        plan: {
          positioning: `The ${title(f)} people keep seeing on TikTok, done right.`,
          target_customer: "Demo: in the real app Claude picks this from the research and product.",
          angles: [{ name: "Wow factor", pitch: "Show it working in 2 seconds." }, { name: "Gift", pitch: "An easy gift that gets a reaction." }],
          copy: { title: title(f), bullets: ["Benefit one (demo)", "Benefit two (demo)", "Benefit three (demo)"], description: "Demo landing page description.", faq: [{ q: "When does it ship?", a: "Early-bird orders ship first." }] },
          offer: { mode: "waitlist", reason: "No inventory yet: collect emails to prove demand first.", price_usd: price, compare_at_usd: null },
          ad_scripts: [{ hook: `Wait for it… (${title(f)})`, body: "Show the product working, then the reaction.", cta: "Join the early-bird list", shot_list: ["Close-up", "Demo", "Reaction"], uses_existing_footage: true }],
          meta: { primary_texts: ["Demo primary text."], headlines: ["Demo headline"] },
          test_plan: { daily_budget_usd: 10, days: 7, success_looks_like: "CTR above 1.5%, signups under $3.", notes: "Kill early if CTR < 0.8%." },
        } }));
      return null;
    }
    case "approve": put("launches", { ...l, status: "approved", approved_by: DEMO_ME, approved_at: now() }); return null;
    case "build":
      put("launches", { ...l, status: "building" });
      later(1500, () => put("launches", { ...get("launches", id)!, status: "built", shopify_handle: "demo", landing_url: "https://example.com/products/demo",
        meta_campaign_id: "demo", meta_adset_id: "demo", meta_ad_ids: ["demo"], meta_status: "paused" }));
      return null;
    case "activate":
      put("launches", { ...l, status: "live", meta_status: "active", activated_by: DEMO_ME, activated_at: now() });
      later(1200, () => {
        const totals = { spend_cents: 3500, impressions: 9000, clicks: 60, waitlist_signups: 6, preorders: 0, days_running: 3 };
        const ev = evaluateKillRules(totals, DEFAULT_KILL_RULES, 1500, "waitlist");
        put("launch_metrics", { id: `lm-${id}`, launch_id: id, date: now().slice(0, 10), ...totals, lp_views: 50, revenue_cents: 0, recommendation: ev.recommendation, reasons: ev.reasons });
      });
      return null;
    case "pause": put("launches", { ...l, status: "paused", meta_status: "paused" }); return null;
    case "kill":
      put("launches", { ...l, status: "killed", meta_status: "paused" });
      put("finds", { ...f, stage: "killed", killed_reason: "Ad test killed" });
      return null;
  }
  return `unknown action ${action}`;
}

export async function demoRpc(fn: string, args: Args): Promise<{ data: unknown; error: { message: string } | null }> {
  const ok = { data: null, error: null };
  switch (fn) {
    case "request_job": {
      const p = args.p_payload ?? {};
      if (args.p_type === "research_find") later(1500, () => research(p.find_id));
      else if (args.p_type === "draft_followups") later(1200, () => (p.supplier_id ? draftFollowup(p) : draftAllFollowups()));
      else if (args.p_type === "process_find") later(1000, () => { const f = get("finds", p.find_id); if (f) fakeExtract(f); });
      else if (args.p_type === "score_find") rescoreAll();
      return ok;
    }
    case "launch_action": {
      const err = launchAction(args.p_launch_id, args.p_action);
      return err ? { data: null, error: { message: err } } : ok;
    }
    case "set_config": {
      const row = all("config").find((c) => c.key === args.k);
      put("config", { ...(row ?? { id: uuidv7(), key: args.k }), value: args.v, verified_at: args.verified ? now().slice(0, 10) : row?.verified_at ?? null });
      rescoreAll();
      return ok;
    }
    default:
      return ok;
  }
}

export async function demoApi(body: Args): Promise<unknown> {
  if (body.action === "translate") {
    return { translation: body.to === "en" ? "(Demo) The real app translates this with Claude." : "（演示）真实应用会用AI翻译这句话。", pinyin: body.to === "en" ? null : "(yǎnshì)" };
  }
  if (body.action === "photo_query") return { query: "lamp" };
  throw new Error("Not available in the web demo");
}

/** Start background simulation: process new captures, keep scores fresh. */
export function startDemoServer() {
  rescoreAll();
  const pending = new Set<string>();
  subscribe("finds", () => {
    if (writing) return;
    for (const f of all("finds")) {
      if (f.processing_state === "pending" && !pending.has(f.id)) {
        pending.add(f.id);
        later(1800, () => { const cur = get("finds", f.id); if (cur) fakeExtract(cur); pending.delete(f.id); });
      }
    }
  });
  let t: ReturnType<typeof setTimeout> | null = null;
  const soon = () => { if (writing) return; if (t) clearTimeout(t); t = setTimeout(rescoreAll, 250); };
  for (const tbl of ["finds", "votes", "cost_calcs", "research"]) subscribe(tbl, soon);
}
