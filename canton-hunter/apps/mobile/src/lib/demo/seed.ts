/** WEB DEMO: realistic sample data so every screen has something to show. Resettable from More. */
import { CONFIG_DEFAULTS, DEFAULT_KILL_RULES } from "@canton/core";
import { applyServerRows, type Row } from "../store";
import { cardImage, productImage } from "./images";

export const DEMO_ME = "d0000000-0000-7000-8000-00000000000a";
const UNCLE = "d0000000-0000-7000-8000-00000000000b";
const SHABAB = "d0000000-0000-7000-8000-00000000000c";
const PEOPLE = [DEMO_ME, UNCLE, SHABAB];

/** media id -> image (the web demo's stand-in for local files) */
export const demoImages = new Map<string, string>();

const id = (prefix: string, n: number) => `d${prefix.padStart(7, "0")}-0000-7000-8000-${String(n).padStart(12, "0")}`;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

const SUPPLIERS = [
  ["Guangzhou Sunny Lighting Co., Ltd.", "广州市阳光照明有限公司", "11.2A15", "11.2", "Lily Chen", "+86 138 0013 8000", "sunnylight88", true],
  ["Shenzhen Brightway Electronics", "深圳明途电子有限公司", "11.3C08", "11.3", "Kevin Wu", "+86 139 0013 9000", "brightway_kw", false],
  ["Yiwu Happy Baby Products Factory", "义乌开心宝贝用品厂", "17.1B22", "17.1", "Anna Zhou", "+86 137 0013 7000", "happybaby_anna", true],
  ["Ningbo Petstar Co., Ltd.", "宁波宠星有限公司", "15.3D11", "15.3", "Tom Li", "+86 136 0013 6000", "petstar_tom", true],
  ["Dongguan Cozy Home Trading", "东莞舒居贸易有限公司", "9.1E05", "9.1", "Grace Huang", "+86 135 0013 5000", "cozyhome_g", false],
  ["Foshan Glow Beauty Tech", "佛山光彩美容科技有限公司", "12.2A31", "12.2", "Mia Sun", "+86 134 0013 4000", "glowbeauty_mia", true],
] as const;

// supplier, title, key, category, fob, cur, moq, lead, weight, dims, gut, demo, giftable, compliance, logo, retail lo/hi, competition, emoji, hue, stage, hoursAgo
const P: [number, string, string, string, number, string, number, number, number, number[], string, number, boolean, string, boolean, number, number, string, string, number, string, number][] = [
  [0, "LED Sunset Projection Lamp", "sunset projection lamp", "Home decor lighting", 2.1, "USD", 500, 20, 350, [160, 100, 90], "fire", 5, true, "easy", true, 24, 35, "med", "🌅", 20, "testing", 30],
  [1, "Sunset Lamp with Remote (16 colors)", "sunset projection lamp", "Home decor lighting", 2.65, "USD", 300, 15, 380, [170, 105, 95], "good", 5, true, "easy", true, 24, 35, "med", "🌇", 30, "quote_requested", 27],
  [0, "Galaxy Star Projector", "galaxy star projector", "Home decor lighting", 6.8, "USD", 300, 25, 600, [200, 200, 150], "good", 5, true, "easy", true, 29, 45, "high", "🌌", 250, "found", 29],
  [2, "Silicone Baby Bib with Food Catcher", "silicone baby bib", "Baby feeding", 12, "CNY", 1000, 20, 90, [220, 150, 30], "good", 3, true, "hard", true, 12, 18, "saturated", "👶", 330, "found", 22],
  [2, "Montessori Busy Board (wood)", "montessori busy board", "Kids toys", 4.2, "USD", 500, 30, 700, [300, 250, 40], "fire", 4, true, "hard", true, 29, 49, "med", "🧩", 40, "shortlisted", 21],
  [3, "Self-Cleaning Cat Brush", "self cleaning pet brush", "Pet grooming", 1.35, "USD", 1000, 15, 120, [180, 90, 50], "fire", 5, true, "none", true, 14, 22, "high", "🐱", 280, "sample_in_hand", 20],
  [3, "Retractable Cat Feather Wand", "cat feather wand toy", "Pet toys", 0.6, "USD", 3000, 15, 60, [400, 40, 40], "meh", 3, false, "none", true, 8, 12, "saturated", "🪶", 190, "found", 19],
  [4, "Heated Eye Mask (USB)", "heated eye mask", "Personal care", 3.8, "USD", 2000, 20, 110, [200, 100, 30], "good", 3, true, "hard", true, 19, 29, "med", "😴", 220, "found", 6],
  [4, "Magnetic Foldable Phone Stand", "magnetic phone stand", "Phone accessories", 8, "CNY", 300, 10, 80, [100, 70, 15], "meh", 2, false, "none", false, 9, 15, "saturated", "📱", 200, "found", 5],
  [5, "Nano Mist Facial Sprayer", "nano facial mist sprayer", "Beauty devices", 2.9, "USD", 500, 20, 90, [130, 50, 50], "good", 4, true, "easy", true, 16, 25, "med", "💨", 170, "found", 4],
  [5, "Ice Roller for Face", "face ice roller", "Beauty tools", 0.95, "USD", 1000, 15, 100, [150, 60, 40], "fire", 4, true, "none", true, 12, 19, "med", "🧊", 185, "shortlisted", 3],
  [1, "Motion Sensor Magnetic Night Light", "motion sensor night light", "Home lighting", 1.9, "USD", 1000, 18, 70, [80, 80, 30], "good", 4, true, "easy", true, 15, 24, "med", "💡", 50, "found", 2],
];

// images exist on every load (the rows persist in the browser; images are regenerated, not stored)
P.forEach((p, i) => {
  const s = SUPPLIERS[p[0]]!;
  demoImages.set(id("m", i * 2), productImage(p[18], p[1], p[19]));
  demoImages.set(id("m", i * 2 + 1), cardImage(s[0], s[1], s[4], s[5], s[2]));
});

export function seedDemo(): void {
  const base = { deleted_at: null, created_at: hoursAgo(40), updated_at: hoursAgo(40) };
  applyServerRows("profiles", [
    { id: DEMO_ME, name: "Mahdy", color: "#F59E0B", ...base },
    { id: UNCLE, name: "Uncle", color: "#34D399", ...base },
    { id: SHABAB, name: "Shabab", color: "#F472B6", ...base },
  ]);
  applyServerRows("config", Object.entries(CONFIG_DEFAULTS).map(([key, d], i) => ({ id: id("c", i), key, value: d.value, note: d.note, verified_at: null, ...base })));

  const sups: Row[] = SUPPLIERS.map(([en, cn, booth, hall, contact, phone, wechat, factory], i) => ({
    id: id("s", i), name_en: en, name_cn: cn, booth_code: booth, hall, contact_name: contact, title: "Sales Manager",
    phones: [phone], emails: [`sales${i + 1}@example.cn`], wechat_id: wechat, wechat_qr_payload: `https://u.wechat.com/demo-${wechat}`,
    is_factory_ai: factory, is_factory_override: null, website: null, address: null, alibaba_url: null, notes: null, merged_into_id: null, ...base,
  }));
  applyServerRows("suppliers", sups);

  const groups = new Map<string, string>();
  const finds: Row[] = [], media: Row[] = [], research: Row[] = [], votes: Row[] = [];
  P.forEach((p, i) => {
    const [si, title, key, cat, fob, cur, moq, lead, w, dims, gut, demo, gift, comp, logo, lo, hi, competition, emoji, hue, stage, ago] = p;
    if (!groups.has(key)) groups.set(key, id("g", groups.size));
    const fid = id("f", i);
    const who = PEOPLE[i % 3]!;
    const s = SUPPLIERS[si]!;
    finds.push({
      id: fid, supplier_id: sups[si]!.id, captured_by: who, created_by: who, captured_at: hoursAgo(ago), day_index: null,
      hall: s[3], booth_code: s[2], qr_payload: null,
      transcript: `${title.split(" ").slice(0, 3).join(" ")}, ${fob} ${cur === "CNY" ? "RMB" : "dollars"}, MOQ ${moq}, lead time ${lead} days${logo ? ", they can do our logo" : ""}`,
      gut, title_ai: title, title_override: null, description_ai: `${title}. Found at booth ${s[2]}. (Demo data: in the real app Claude writes this from the photo and your voice note.)`,
      description_override: null, category_ai: cat, category_override: null, tags_ai: key.split(" "),
      fob_price_cents: Math.round(fob * 100), fob_currency: cur, moq, sample_cost_cents: 1500, lead_time_days: lead,
      oem_logo: logo, packaging_custom: logo, sells_to_us_sellers: competition === "saturated", certifications: comp === "hard" ? [] : ["CE"],
      unit_weight_g: w, box_dims_mm: dims, fragile: false, giftable_ai: gift, demo_score_ai: demo,
      compliance_ai: { risk: comp, flags: comp === "hard" ? (/Kids|Baby/.test(cat) ? ["CPC (children's product, kids under 12)"] : ["Heating element / electrical safety"]) : comp === "easy" ? ["FCC (electronics)"] : [] },
      compliance_override: null, hts_guess_ai: /light/i.test(cat) ? "9405.49" : null, hunt_item_id: i === 0 ? id("h", 0) : i === 5 ? id("h", 1) : null,
      processing_state: "done", stage, killed_reason: null, ai_confidence: i === 3 ? [{ field: "supplier.phones", value: 0.4 }] : [],
      product_key_ai: key, product_group_id: groups.get(key), deleted_at: null, created_at: hoursAgo(ago), updated_at: hoursAgo(ago),
    });
    const pm = id("m", i * 2), cm = id("m", i * 2 + 1);
    void emoji; void hue;
    media.push({ id: pm, find_id: fid, kind: "product_photo", upload_state: "uploaded", storage_path: null, mime: "image/jpeg", ...base });
    media.push({ id: cm, find_id: fid, kind: "card_photo", upload_state: "uploaded", storage_path: null, mime: "image/jpeg", ...base });
    research.push({
      id: id("r", i), find_id: fid, status: "done", retail_low_cents: lo * 100, retail_high_cents: hi * 100, competition, ip_risk: i === 2 ? "med" : "low",
      summary: `Sells for $${lo}–$${hi} on Amazon and TikTok Shop. Competition is ${competition}. ${gift ? "Strong Q4 gift angle." : "Weak gift angle."}`,
      report: {
        comparables: [{ platform: "Amazon", title: `${title} (similar)`, price_usd: hi, url: "https://www.amazon.com/", notes: null },
          { platform: "TikTok Shop", title: `${title} viral version`, price_usd: lo, url: "https://www.tiktok.com/", notes: null }],
        retail_low_usd: lo, retail_high_usd: hi, competition, competition_notes: "Demo data", trend_notes: "Demo: trending in #TikTokMadeMeBuyIt style videos this fall.",
        cheaper_source_found: i === 6, cheaper_source_notes: i === 6 ? "Same wand is $0.42 on 1688." : null, ip_risk: "low", ip_notes: "Generic design", summary: "demo",
      },
      sources: [{ platform: "Amazon", title: `${title} (similar)`, url: "https://www.amazon.com/", price_usd: hi }], model: "demo", ...base,
    });
    PEOPLE.forEach((u, k) => {
      if ((i + k) % 3 === 0 && ago < 12) return; // leave some recent ones unvoted for Nightly Review
      votes.push({ id: id("v", i * 3 + k), find_id: fid, user_id: u, value: gut === "fire" ? 2 : gut === "good" ? (k === 2 ? 2 : 1) : -1, comment: null, ...base });
    });
  });
  applyServerRows("finds", finds);
  applyServerRows("media", media);
  applyServerRows("research", research);
  applyServerRows("votes", votes);

  applyServerRows("hunt_items", [
    ["Sunset / projection lamps", "Home decor", "Huge on TikTok, giftable, cheap to air ship", 250, 2999],
    ["Pet grooming gadgets", "Pet", "Satisfying demo videos, repeat buyers", 150, 1999],
    ["Kitchen gadgets under $20", "Kitchen", "Impulse buys, easy to film", 200, 1999],
    ["Cozy / self-care gifts", "Personal care", "Q4 gifting, heated and massage items", 400, 2999],
    ["Travel organizers", "Bags", "Light, no certification, broad audience", 150, 2499],
    ["Desk & phone accessories", "Office", "Cheap, but check saturation", 100, 1499],
  ].map(([t, c, why, fobC, retC], i) => ({ id: id("h", i), title: t, category: c, why, priority: i < 2 ? 1 : i < 4 ? 2 : 3, target_fob_cents: fobC, target_retail_cents: retC, source_urls: [], ...base })));

  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  applyServerRows("hall_assignments", [
    { id: id("a", 0), date: today, user_id: DEMO_ME, halls: ["11.2", "11.3"], note: null, ...base },
    { id: id("a", 1), date: today, user_id: UNCLE, halls: ["17.1", "17.2"], note: null, ...base },
    { id: id("a", 2), date: today, user_id: SHABAB, halls: ["15.3", "12.2"], note: null, ...base },
  ]);

  applyServerRows("samples", [
    { id: id("x", 0), find_id: id("f", 5), supplier_id: sups[3]!.id, status: "in_hand", carried_by: DEMO_ME, bag_label: "Grey suitcase", paid_cents: 1500, declared_value_cents: 1000, tracking: null, notes: null, ...base },
    { id: id("x", 1), find_id: id("f", 0), supplier_id: sups[0]!.id, status: "paid", carried_by: SHABAB, bag_label: "Black backpack", paid_cents: 2000, declared_value_cents: 1500, tracking: null, notes: null, ...base },
  ]);

  applyServerRows("followups", [{
    id: id("u", 0), supplier_id: sups[1]!.id, find_ids: [id("f", 1)], channel: "wechat", purpose: "quote", subject: "Sunset lamp quote",
    body_zh: "Kevin 您好！我们是在广交会11.3C08展位认识的美国买家（Mahdy和Shabab）。我们对你们的16色遥控日落灯很感兴趣。\n\n想确认：\n1. 500个和2500个的FOB价格\n2. 交货期\n3. 定制logo和包装的费用\n4. 外箱尺寸和重量\n\n谢谢！期待您的回复。",
    body_en: "Hi Kevin! We're the US buyers (Mahdy and Shabab) you met at Canton Fair booth 11.3C08. We're interested in your 16-color sunset lamp with remote.\n\nCould you confirm:\n1. FOB price at 500 and 2,500 pcs\n2. Lead time\n3. Cost for custom logo and packaging\n4. Carton size and weight\n\nThank you! Looking forward to your reply.",
    asks: ["FOB at 500 / 2500", "Lead time", "Logo + packaging cost", "Carton size/weight"], status: "sent", sent_at: hoursAgo(20), sent_by: DEMO_ME, reply_notes: null, ...base,
  }]);

  const lid = id("l", 0);
  applyServerRows("launches", [{
    id: lid, find_id: id("f", 0), status: "live", mode: "waitlist", ship_by_date: new Date(Date.now() + 40 * 86400_000).toISOString().slice(0, 10), price_cents: 2999,
    plan: {
      positioning: "Turn any bedroom into golden hour: the viral sunset lamp, built better.",
      target_customer: "Women 18-34 decorating dorms and apartments; TikTok aesthetic room-tour crowd.",
      angles: [{ name: "Instant vibe", pitch: "One click and your room looks like golden hour." }, { name: "Photo magic", pitch: "The lighting creators use for selfies and videos." }, { name: "Gift that wows", pitch: "The easiest gift that always gets a reaction." }],
      copy: { title: "Golden Hour Sunset Lamp", bullets: ["16 colors + remote", "Rotates 180° to aim anywhere", "USB powered, no batteries", "Perfect for photos and videos", "Gift-ready box"], description: "Recreate golden hour any time. Aim it at a wall and watch your room glow.", faq: [{ q: "When does it ship?", a: "Early-bird orders ship before the holidays." }, { q: "Is it bright enough?", a: "Yes. Best in a dim room, like real golden hour." }] },
      offer: { mode: "waitlist", reason: "Lead time and freight not confirmed yet, so collect emails first.", price_usd: 29.99, compare_at_usd: 39.99 },
      ad_scripts: [{ hook: "POV: your room at 9pm vs with this lamp", body: "Show the dark room, click on, pan the glow, selfie in the light.", cta: "Join the early-bird list, link in bio", shot_list: ["Dark room wide", "Click on close-up", "Slow pan of glow", "Selfie in the light"], uses_existing_footage: true }],
      meta: { primary_texts: ["Golden hour, any hour. Join the early-bird list for 25% off."], headlines: ["Your room, but golden hour"] },
      test_plan: { daily_budget_usd: 10, days: 7, success_looks_like: "CTR above 1.5% and waitlist signups under $3 each.", notes: "Kill by day 4 if CTR is under 0.8%." },
    },
    approved_by: DEMO_ME, approved_at: hoursAgo(10), shopify_product_id: "demo", shopify_handle: "golden-hour-sunset-lamp", landing_url: "https://example.com/products/golden-hour-sunset-lamp",
    meta_campaign_id: "demo", meta_adset_id: "demo", meta_ad_ids: ["demo"], meta_status: "active", activated_by: DEMO_ME, activated_at: hoursAgo(50),
    kill_rules: DEFAULT_KILL_RULES, last_error: null, ...base,
  }]);
  const d = (n: number) => new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
  applyServerRows("launch_metrics", [
    { id: id("k", 0), launch_id: lid, date: d(2), spend_cents: 1000, impressions: 4200, clicks: 71, lp_views: 60, waitlist_signups: 0, preorders: 0, revenue_cents: 0, recommendation: null, reasons: [], ...base },
    { id: id("k", 1), launch_id: lid, date: d(1), spend_cents: 1000, impressions: 3900, clicks: 64, lp_views: 55, waitlist_signups: 0, preorders: 0, revenue_cents: 0, recommendation: null, reasons: [], ...base },
    { id: id("k", 2), launch_id: lid, date: d(0), spend_cents: 1000, impressions: 4400, clicks: 80, lp_views: 69, waitlist_signups: 14, preorders: 0, revenue_cents: 0, recommendation: "keep", reasons: ["Within thresholds"], ...base },
  ]);

  applyServerRows("content_items", [
    { id: id("t", 0), date: today, media_id: id("m", 0), kind: "clip", hooks: ["We flew 7,000 miles for this lamp", "POV: you find the viral lamp at the factory", "This costs $2 to make?!"], caption: "Day 3 at the Canton Fair and we found THE sunset lamp 🌅", hashtags: ["cantonfair", "sunsetlamp", "roomdecor", "smallbusiness"], on_screen_text: "Factory price: $2.10", script: null, post_order: 1, posted: false, posted_url: null, ...base },
    { id: id("t", 1), date: today, media_id: id("m", 10), kind: "clip", hooks: ["The cat brush that cleans itself", "Cat owners, you need this"], caption: "One click and the fur is gone 🐱", hashtags: ["cattok", "catsoftiktok", "cantonfair"], on_screen_text: "Self-cleaning!", script: null, post_order: 2, posted: true, posted_url: null, ...base },
    { id: id("t", 2), date: today, media_id: null, kind: "recap", hooks: [], caption: null, hashtags: [], on_screen_text: null, script: "Day 3 in Guangzhou. [Walking shot, Hall 11] We hit the lighting halls and found a sunset lamp for $2.10... [cut to booth] Then the pet hall: a cat brush that cleans itself. [demo clip] Tomorrow: kids and baby. Which one should we sell? Comment below.", post_order: 99, posted: false, posted_url: null, ...base },
  ]);

  applyServerRows("pipeline_events", [
    { id: id("e", 0), find_id: id("f", 0), from_stage: "found", to_stage: "shortlisted", by_user: null, note: "Auto: 3 must-test votes", ...base },
    { id: id("e", 1), find_id: id("f", 0), from_stage: "shortlisted", to_stage: "testing", by_user: DEMO_ME, note: null, ...base },
  ]);
}
