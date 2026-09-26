import { FollowupDraft } from "@core";
import { extract, text } from "../../_shared/claude.ts";
import { loadConfig } from "../../_shared/config.ts";
import { db, must, type Row } from "../../_shared/db.ts";
import { pushTeam } from "../../_shared/push.ts";

const ACTIVE_STAGES = ["shortlisted", "quote_requested", "quote_received", "sample_requested", "sample_in_hand", "testing", "negotiating"];

const SYSTEM = `You write follow-up messages from a small US buyer team to Chinese suppliers they met at the Canton Fair.
Most suppliers read WeChat on their phone: keep it short, warm and very specific. Write the Chinese first, the way a
Chinese sales rep would naturally read it (not a stiff translation), then the same message in English.
Always remind them where you met (fair, hall/booth, which products — describe each product so they can recognize it).
Ask only for what is still missing, as a numbered list. Typical asks by purpose:
- quote: price at MOQ and at 5x MOQ, MOQ, lead time, custom logo/packaging options and cost, carton size/weight.
- sample: sample price + shipping to our US address (given), how to pay, how long.
- negotiate: a better price for a larger first order; be friendly and firm, never rude.
- order: confirm specs, packaging, lead time, payment via Alibaba Trade Assurance or company bank account, pre-shipment inspection.
Never promise an order. Never share our margins or retail prices. Sign with the buyer names given.`;

function describeFind(f: Row): Row {
  return {
    product: f.title_override ?? f.title_ai,
    description: (f.description_override ?? f.description_ai ?? "").slice(0, 200),
    known: {
      fob: f.fob_price_cents != null ? `${(f.fob_price_cents / 100).toFixed(2)} ${f.fob_currency ?? "USD"}` : null,
      moq: f.moq, lead_time_days: f.lead_time_days, custom_logo: f.oem_logo, custom_packaging: f.packaging_custom,
      sample_cost: f.sample_cost_cents != null ? (f.sample_cost_cents / 100).toFixed(2) : null,
      weight_g: f.unit_weight_g, certifications: f.certifications,
    },
    stage: f.stage,
  };
}

async function draftOne(supplier: Row, finds: Row[], purpose: string, followupId: string | null, companyCfg: Row): Promise<Row> {
  const sb = db();
  const ctx = {
    purpose,
    supplier: { name_en: supplier.name_en, name_cn: supplier.name_cn, contact: supplier.contact_name, hall: supplier.hall, booth: supplier.booth_code },
    products: finds.map(describeFind),
    us: companyCfg,
  };
  const { data, usage } = await extract({ system: SYSTEM, content: [text(JSON.stringify(ctx, null, 2))], schema: FollowupDraft, effort: "medium" });
  const row = {
    supplier_id: supplier.id,
    find_ids: finds.map((f) => f.id),
    channel: supplier.wechat_id || supplier.wechat_qr_payload || !(supplier.emails ?? []).length ? "wechat" : "email",
    purpose,
    subject: data.subject,
    body_en: data.body_en,
    body_zh: data.body_zh,
    asks: data.asks,
    status: "draft",
  };
  if (followupId) must(await sb.from("followups").update(row).eq("id", followupId), "update followup");
  else must(await sb.from("followups").insert({ id: crypto.randomUUID(), ...row }), "insert followup");
  return { supplier: supplier.id, usage };
}

/** Draft follow-ups: one supplier (payload.supplier_id) or every supplier with active finds and no follow-up yet. */
export async function draftFollowups(payload: { supplier_id?: string; followup_id?: string; purpose?: string }): Promise<Row> {
  const sb = db();
  const cfg = await loadConfig();
  const company = (cfg.company ?? {}) as Row;
  const purpose = payload.purpose ?? "quote";

  let supplierIds: string[];
  if (payload.supplier_id) supplierIds = [payload.supplier_id];
  else {
    const active = must(await sb.from("finds").select("supplier_id").in("stage", ACTIVE_STAGES).is("deleted_at", null).not("supplier_id", "is", null), "active finds") as Row[];
    const existing = must(await sb.from("followups").select("supplier_id").is("deleted_at", null), "followups") as Row[];
    const done = new Set(existing.map((e) => e.supplier_id));
    supplierIds = [...new Set(active.map((a) => a.supplier_id as string))].filter((id) => !done.has(id));
  }

  const results: Row[] = [];
  for (const sid of supplierIds.slice(0, 25)) {
    const supplier = must(await sb.from("suppliers").select("*").eq("id", sid).single(), "supplier") as Row;
    let finds = must(await sb.from("finds").select("*").eq("supplier_id", sid).is("deleted_at", null).neq("stage", "killed"), "finds") as Row[];
    const active = finds.filter((f) => ACTIVE_STAGES.includes(f.stage));
    if (active.length) finds = active;
    if (!finds.length) continue;
    try {
      results.push(await draftOne(supplier, finds.slice(0, 8), purpose, payload.followup_id ?? null, company));
    } catch (e) {
      results.push({ supplier: sid, error: String((e as Error).message) });
      if (payload.followup_id) await sb.from("followups").update({ status: "draft", body_en: `Draft failed: ${(e as Error).message}` }).eq("id", payload.followup_id);
    }
  }
  if (!payload.supplier_id && results.length) {
    await pushTeam({ title: "✉️ Follow-ups drafted", body: `${results.filter((r) => !r.error).length} supplier messages ready to send`, data: { type: "followups" } });
  }
  return { drafted: results.length, results };
}
