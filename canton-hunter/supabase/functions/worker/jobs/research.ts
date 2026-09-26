import { HuntList, ResearchReport } from "@core";
import { image, researchWithSubmit, text, type Content } from "../../_shared/claude.ts";
import { loadConfig } from "../../_shared/config.ts";
import { db, must, nowIso, type Row } from "../../_shared/db.ts";
import { downloadBase64 } from "../../_shared/storage.ts";

const RESEARCH_SYSTEM = `You are a product research analyst for a small US e-commerce team sourcing at the Canton Fair.
For the product given, search the web and report on the US market:
- Comparable listings on Amazon US, TikTok Shop US, Walmart/Etsy if relevant (title, price in USD, URL).
- The realistic US retail price range for this kind of product.
- Competition: low (few sellers), med, high (many sellers / big reviews), saturated (everywhere, race to the bottom).
- Trend signals (TikTok virality, seasonal demand, Q4 gift potential).
- Whether AliExpress or 1688 sells the same item cheaper than the quoted FOB price.
- IP risk: does it look like a copy of a branded, trademarked or patented product (high), similar design (med), generic (low)?
Be concrete and cite URLs you actually found. Keep notes short. When done, call the submit tool.`;

export async function researchFind(payload: { find_id: string }): Promise<Row> {
  const sb = db();
  const f = must(await sb.from("finds").select("*").eq("id", payload.find_id).single(), "find") as Row;
  const photo = (await sb.from("media").select("storage_path").eq("find_id", f.id).eq("kind", "product_photo")
    .eq("upload_state", "uploaded").is("deleted_at", null).limit(1).maybeSingle()).data as Row | null;
  const content: Content[] = [];
  if (photo) {
    const { data, mime } = await downloadBase64(photo.storage_path);
    content.push(text("PRODUCT PHOTO:"), image(data, mime));
  }
  const fob = f.fob_price_cents != null ? `${(f.fob_price_cents / 100).toFixed(2)} ${f.fob_currency ?? "USD"}` : "unknown";
  content.push(text([
    `PRODUCT: ${f.title_override ?? f.title_ai ?? "unknown"}`,
    `DESCRIPTION: ${f.description_override ?? f.description_ai ?? ""}`,
    `CATEGORY: ${f.category_override ?? f.category_ai ?? ""}`,
    `QUOTED FOB: ${fob}, MOQ ${f.moq ?? "unknown"}`,
  ].join("\n")));

  const { data: r, usage } = await researchWithSubmit({
    system: RESEARCH_SYSTEM,
    content,
    schema: ResearchReport,
    submitDescription: "Submit the final research report for this product.",
    effort: "medium",
    maxSearches: 6,
  });
  const cents = (n: number | null) => (n == null ? null : Math.round(n * 100));
  must(await sb.from("research").upsert({
    find_id: f.id,
    status: "done",
    report: r,
    retail_low_cents: cents(r.retail_low_usd),
    retail_high_cents: cents(r.retail_high_usd),
    competition: r.competition,
    ip_risk: r.ip_risk,
    summary: r.summary,
    sources: r.comparables.map((c) => ({ platform: c.platform, title: c.title, url: c.url, price_usd: c.price_usd })),
    model: usage.model,
    usage,
    updated_at: nowIso(),
  }, { onConflict: "find_id" }), "upsert research");
  return { usage };
}

const HUNT_SYSTEM = `You help a 3-person team plan what to look for at the Canton Fair (Guangzhou). They sell to US
consumers through Shopify landing pages and Meta/TikTok ads, testing at $10/day per product, and want products that:
retail for at least 3x landed cost, show their value in a 5-second video, are small/light enough to air freight,
need no hard certification, aren't saturated, can carry a custom logo, and ideally make good Q4/Christmas gifts.
Research what is trending right now on TikTok Shop US and Amazon US in the fair categories given, then submit
about 30 specific hunt items (a product type a person can spot at a booth, not a vague category), ordered by priority.`;

export async function buildHuntList(payload: { categories?: string; count?: number }): Promise<Row> {
  const sb = db();
  const cfg = await loadConfig();
  const categories = payload.categories ??
    (cfg.fair_phases as { phase: number; start: string; end: string; categories: string }[] | undefined)
      ?.map((p) => `Phase ${p.phase} (${p.start} to ${p.end}): ${p.categories}`).join("\n") ?? "general consumer goods";
  const existing = must(await sb.from("hunt_items").select("title").is("deleted_at", null), "hunt") as Row[];
  const { data, usage } = await researchWithSubmit({
    system: HUNT_SYSTEM,
    content: [text(`FAIR CATEGORIES WE WILL SEE:\n${categories}\n\nALREADY ON OUR LIST (skip these): ${existing.map((e) => e.title).join(" | ") || "none"}\n\nTarget about ${payload.count ?? 30} items.`)],
    schema: HuntList,
    submitDescription: "Submit the hunt list.",
    effort: "high",
    maxSearches: 10,
  });
  const cents = (n: number | null) => (n == null ? null : Math.round(n * 100));
  const rows = data.items.map((i) => ({
    id: crypto.randomUUID(), title: i.title, category: i.category, why: i.why, priority: Math.round(i.priority),
    target_fob_cents: cents(i.target_fob_usd), target_retail_cents: cents(i.target_retail_usd), source_urls: i.source_urls,
  }));
  if (rows.length) must(await sb.from("hunt_items").insert(rows), "insert hunt items");
  return { added: rows.length, usage };
}
