import { FindExtraction, findSupplierMatch, normalizePhone, toUsd, parseBoothCode, type SupplierKeys } from "@core";
import { extract, image, text, type Content } from "../../_shared/claude.ts";
import { loadConfig } from "../../_shared/config.ts";
import { db, must, type Row } from "../../_shared/db.ts";
import { downloadBase64 } from "../../_shared/storage.ts";

const SYSTEM = `You organize product finds for a 3-person team at the Canton Fair in Guangzhou, China.
They are sourcing products to sell to US consumers online (Shopify + Meta/TikTok ads), with a focus on
small, light, giftable products that can be air-freighted before Christmas.

You get: product photo(s), business card photo(s) (often Chinese + English), an optional WeChat QR payload,
an optional voice-note transcript from the team member, and the hall they were in.

Rules:
- Read the business card carefully, including Chinese text. Copy phone numbers, emails and WeChat IDs exactly.
- Take prices, MOQ, lead time and yes/no answers ONLY from the transcript. If not said, use null. Never invent them.
  Spoken prices like "two ten" mean 2.10. Assume USD unless they say RMB/yuan/CNY.
- Weight and box size are your estimates from the photo; be conservative.
- Compliance: flag CPC/children's product (for kids under 12), FCC (electronics/radios), FDA (food contact,
  cosmetics, skin), lithium batteries (UN38.3 / shipping restrictions), Prop 65, and "looks like a copy of a
  branded or patented product". risk: none | easy (e.g. simple labeling) | hard (lab testing/certification) |
  blocked (illegal/unsellable in the US).
- demo_score_1_5: 5 = the value is obvious and fun in a 5-second phone video; 1 = boring on camera.
- hunt_item_match_title: the exact title from the hunt list if this product clearly matches one, else null.
- confidence: include entries for any field you are unsure about (value 0-1), especially card fields.`;

export async function processFind(payload: { find_id: string }): Promise<Row> {
  const sb = db();
  const find = must(await sb.from("finds").select("*").eq("id", payload.find_id).single(), "load find") as Row;
  if (find.deleted_at) return { skipped: "deleted" };
  await sb.from("finds").update({ processing_state: "processing" }).eq("id", find.id);

  const media = must(
    await sb.from("media").select("*").eq("find_id", find.id).is("deleted_at", null).eq("upload_state", "uploaded"),
    "load media",
  ) as Row[];
  const hunt = must(await sb.from("hunt_items").select("id,title").is("deleted_at", null), "hunt") as Row[];

  const content: Content[] = [];
  const labels: Record<string, string> = { product_photo: "PRODUCT PHOTO", card_photo: "BUSINESS CARD", qr_photo: "WECHAT QR PHOTO" };
  for (const kind of ["product_photo", "card_photo"] as const) {
    const items = media.filter((m) => m.kind === kind).slice(0, 4);
    for (const [i, m] of items.entries()) {
      const { data, mime } = await downloadBase64(m.storage_path);
      content.push(text(`${labels[kind]} ${i + 1}:`), image(data, mime));
    }
  }
  // Same-booth captures reuse an existing supplier: give its card data as text instead of a photo.
  if (find.supplier_id) {
    const s = must(await sb.from("suppliers").select("*").eq("id", find.supplier_id).single(), "supplier") as Row;
    content.push(text(`KNOWN SUPPLIER (same booth as previous capture): ${JSON.stringify({ name_en: s.name_en, name_cn: s.name_cn, booth_code: s.booth_code, phones: s.phones })}`));
  }
  content.push(text([
    `HALL: ${find.hall ?? "unknown"}`,
    `BOOTH (typed): ${find.booth_code ?? "none"}`,
    `WECHAT QR PAYLOAD: ${find.qr_payload ?? "none"}`,
    `VOICE NOTE TRANSCRIPT: ${find.transcript?.trim() || "none"}`,
    `HUNT LIST: ${hunt.map((h) => h.title).join(" | ") || "none"}`,
  ].join("\n")));

  const { data: x, usage } = await extract({ system: SYSTEM, content, schema: FindExtraction, effort: "low" });
  const cfg = await loadConfig();

  // ---- supplier ----
  const booth = x.supplier.booth_code ?? find.booth_code ?? (find.transcript ? parseBoothCode(find.transcript)?.booth : null) ?? null;
  const incoming = {
    name_en: x.supplier.name_en, name_cn: x.supplier.name_cn, contact_name: x.supplier.contact_name, title: x.supplier.title,
    phones: x.supplier.phones.map((p) => normalizePhone(p) ?? p), emails: x.supplier.emails.map((e) => e.trim().toLowerCase()),
    wechat_id: x.supplier.wechat_id, website: x.supplier.website, address: x.supplier.address,
    booth_code: booth, hall: x.supplier.hall ?? find.hall, is_factory_ai: x.answers.is_factory,
  };
  let supplierId: string | null = find.supplier_id;
  const hasCardData = !!(incoming.name_en || incoming.name_cn || incoming.phones.length || incoming.emails.length || incoming.wechat_id);
  if (!supplierId && hasCardData) {
    const existing = must(
      await sb.from("suppliers").select("id,name_en,name_cn,phones,emails,wechat_id,booth_code").is("deleted_at", null).is("merged_into_id", null),
      "suppliers",
    ) as SupplierKeys[];
    const match = findSupplierMatch(incoming, existing);
    if (match.kind === "auto") {
      supplierId = match.id;
    } else {
      supplierId = crypto.randomUUID();
      must(await sb.from("suppliers").insert({ id: supplierId, ...incoming, wechat_qr_payload: find.qr_payload, created_by: find.created_by }), "insert supplier");
      if (match.kind === "candidate") {
        must(await sb.from("supplier_dupe_candidates").insert({
          id: crypto.randomUUID(), supplier_a: match.id, supplier_b: supplierId, score: match.score, reasons: match.reasons,
        }), "dupe candidate");
      }
    }
  }
  if (supplierId) await fillMissing("suppliers", supplierId, { ...incoming, wechat_qr_payload: find.qr_payload });

  // ---- find ----
  const p = x.pricing;
  const toCents = (n: number | null) => (n == null ? null : Math.round(n * 100));
  const huntMatch = x.product.hunt_item_match_title
    ? hunt.find((h) => h.title.toLowerCase() === x.product.hunt_item_match_title!.toLowerCase())?.id ?? null
    : null;
  // AI-owned columns always update; human-editable columns only fill when still empty.
  const aiCols = {
    title_ai: x.product.title,
    description_ai: x.product.description,
    category_ai: x.product.category,
    tags_ai: x.product.tags,
    giftable_ai: x.product.giftable,
    demo_score_ai: Math.round(Math.min(5, Math.max(1, x.product.demo_score_1_5))),
    compliance_ai: x.product.compliance,
    hts_guess_ai: x.product.hts_guess ?? (x.product.hts_chapter ? `${x.product.hts_chapter}` : null),
    ai_confidence: x.confidence,
    processing_state: "done",
  };
  const fillCols = {
    supplier_id: supplierId,
    booth_code: booth,
    fob_price_cents: toCents(p.fob_price),
    fob_currency: p.fob_price != null ? (p.currency ?? "USD").toUpperCase() : null,
    moq: p.moq == null ? null : Math.round(p.moq),
    sample_cost_cents: p.sample_cost == null ? null : Math.round(toUsd(p.sample_cost, p.currency, cfg.cost) * 100),
    lead_time_days: p.lead_time_days == null ? null : Math.round(p.lead_time_days),
    oem_logo: x.answers.oem_logo,
    packaging_custom: x.answers.packaging_custom,
    sells_to_us_sellers: x.answers.sells_to_us_sellers,
    unit_weight_g: x.product.est_unit_weight_g == null ? null : Math.round(x.product.est_unit_weight_g),
    box_dims_mm: x.product.est_box_dims_mm?.length === 3 ? x.product.est_box_dims_mm.map(Math.round) : null,
    fragile: x.product.fragile,
    hunt_item_id: huntMatch,
  };
  const patch: Row = { ...aiCols };
  for (const [k, v] of Object.entries(fillCols)) if (find[k] == null && v != null) patch[k] = v;
  if ((!find.certifications || find.certifications.length === 0) && x.answers.certifications.length) patch.certifications = x.answers.certifications;
  // NOTE: never touch updated_at here (it is the device's clock; see sync model in packages/core/src/sync.ts)
  must(await sb.from("finds").update(patch).eq("id", find.id), "update find");

  if (supplierId) {
    await sb.from("media").update({ supplier_id: supplierId }).eq("find_id", find.id).in("kind", ["card_photo", "qr_photo"]).is("supplier_id", null);
  }
  return { usage, supplier_id: supplierId };
}

/** Set columns that are currently null/empty on a row. */
async function fillMissing(table: string, id: string, values: Row): Promise<void> {
  const sb = db();
  const cur = must(await sb.from(table).select("*").eq("id", id).single(), `load ${table}`) as Row;
  const patch: Row = {};
  for (const [k, v] of Object.entries(values)) {
    if (v == null || (Array.isArray(v) && v.length === 0)) continue;
    const c = cur[k];
    if (c == null || (Array.isArray(c) && c.length === 0)) patch[k] = v;
    else if (Array.isArray(c) && Array.isArray(v)) {
      const merged = [...new Set([...c, ...v])];
      if (merged.length !== c.length) patch[k] = merged;
    }
  }
  if (Object.keys(patch).length) must(await sb.from(table).update(patch).eq("id", id), `fill ${table}`);
}
