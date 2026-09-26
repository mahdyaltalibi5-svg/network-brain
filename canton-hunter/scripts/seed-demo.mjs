// Fill the database with realistic demo finds so the team can try the Deal Room, comparisons,
// review and follow-ups before the trip. Everything it creates is tagged "[demo]" and removable.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-demo.mjs          # add demo data
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-demo.mjs --wipe   # remove it
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TAG = "[demo]";
const must = ({ data, error }, what) => { if (error) throw new Error(`${what}: ${error.message}`); return data; };

if (process.argv.includes("--wipe")) {
  const finds = must(await sb.from("finds").select("id").like("transcript", `${TAG}%`), "finds");
  const ids = finds.map((f) => f.id);
  const sups = must(await sb.from("suppliers").select("id").eq("notes", TAG), "suppliers").map((s) => s.id);
  const now = new Date().toISOString();
  if (ids.length) {
    for (const t of ["votes", "research", "scores", "cost_calcs", "pipeline_events"]) await sb.from(t).delete().in("find_id", ids);
    await sb.from("jobs").delete().in("payload->>find_id", ids);
    await sb.from("finds").update({ deleted_at: now }).in("id", ids);
  }
  if (sups.length) {
    await sb.from("followups").update({ deleted_at: now }).in("supplier_id", sups);
    await sb.from("suppliers").update({ deleted_at: now }).in("id", sups);
  }
  console.log(`removed ${ids.length} demo finds, ${sups.length} demo suppliers`);
  process.exit(0);
}

const people = must(await sb.from("profiles").select("id,name"), "profiles");
if (!people.length) throw new Error("Create the team accounts first (scripts/create-users.mjs)");

const SUPPLIERS = [
  ["Guangzhou Sunny Lighting Co., Ltd.", "广州市阳光照明有限公司", "11.2A15", "11.2", "Lily Chen", ["+8613800138000"], "sunnylight88", true],
  ["Shenzhen Brightway Electronics", "深圳明途电子有限公司", "11.3C08", "11.3", "Kevin Wu", ["+8613900139000"], "brightway_kw", false],
  ["Yiwu Happy Baby Products Factory", "义乌开心宝贝用品厂", "17.1B22", "17.1", "Anna Zhou", ["+8613700137000"], "happybaby_anna", true],
  ["Ningbo Petstar Co., Ltd.", "宁波宠星有限公司", "15.3D11", "15.3", "Tom Li", ["+8613600136000"], "petstar_tom", true],
  ["Dongguan Cozy Home Trading", "东莞舒居贸易有限公司", "9.1E05", "9.1", "Grace Huang", ["+8613500135000"], "cozyhome_g", false],
  ["Foshan Glow Beauty Tech", "佛山光彩美容科技有限公司", "12.2A31", "12.2", "Mia Sun", ["+8613400134000"], "glowbeauty_mia", true],
];

const PRODUCTS = [
  // [supplierIdx, title, key, category, fob, cur, moq, lead, weight_g, dims, gut, demo, giftable, compliance, logo, retailLow, retailHigh, competition]
  [0, "LED Sunset Projection Lamp", "sunset projection lamp", "Home decor lighting", 2.1, "USD", 500, 20, 350, [160, 100, 90], "fire", 5, true, "easy", true, 24, 35, "med"],
  [1, "Sunset Lamp with Remote (16 colors)", "sunset projection lamp", "Home decor lighting", 2.65, "USD", 300, 15, 380, [170, 105, 95], "good", 5, true, "easy", true, 24, 35, "med"],
  [0, "Galaxy Star Projector", "galaxy star projector", "Home decor lighting", 6.8, "USD", 300, 25, 600, [200, 200, 150], "good", 5, true, "easy", true, 29, 45, "high"],
  [2, "Silicone Baby Bib with Food Catcher", "silicone baby bib", "Baby feeding", 12, "CNY", 1000, 20, 90, [220, 150, 30], "good", 3, true, "hard", true, 12, 18, "saturated"],
  [2, "Montessori Busy Board (wood)", "montessori busy board", "Kids toys", 4.2, "USD", 500, 30, 700, [300, 250, 40], "fire", 4, true, "hard", true, 29, 49, "med"],
  [3, "Self-Cleaning Cat Brush", "self cleaning pet brush", "Pet grooming", 1.35, "USD", 1000, 15, 120, [180, 90, 50], "fire", 5, true, "none", true, 14, 22, "high"],
  [3, "Interactive Cat Feather Wand (retractable)", "cat feather wand toy", "Pet toys", 0.6, "USD", 3000, 15, 60, [400, 40, 40], "meh", 3, false, "none", true, 8, 12, "saturated"],
  [4, "Heated Eye Mask (USB)", "heated eye mask", "Personal care", 3.8, "USD", 2000, 20, 110, [200, 100, 30], "good", 3, true, "hard", true, 19, 29, "med"],
  [4, "Magnetic Phone Stand (foldable)", "magnetic phone stand", "Phone accessories", 8, "CNY", 300, 10, 80, [100, 70, 15], "meh", 2, false, "none", false, 9, 15, "saturated"],
  [5, "Mini Facial Steamer (nano mist)", "nano facial mist sprayer", "Beauty devices", 2.9, "USD", 500, 20, 90, [130, 50, 50], "good", 4, true, "easy", true, 16, 25, "med"],
  [5, "Ice Roller for Face", "face ice roller", "Beauty tools", 0.95, "USD", 1000, 15, 100, [150, 60, 40], "fire", 4, true, "none", true, 12, 19, "med"],
  [1, "Magnetic LED Night Light (motion sensor)", "motion sensor night light", "Home lighting", 1.9, "USD", 1000, 18, 70, [80, 80, 30], "good", 4, true, "easy", true, 15, 24, "med"],
];

const now = Date.now();
const sid = SUPPLIERS.map(() => randomUUID());
must(await sb.from("suppliers").insert(SUPPLIERS.map(([en, cn, booth, hall, contact, phones, wechat, factory], i) => ({
  id: sid[i], name_en: en, name_cn: cn, booth_code: booth, hall, contact_name: contact, phones, emails: [`sales${i + 1}@example.cn`],
  wechat_id: wechat, is_factory_ai: factory, notes: TAG,
}))), "insert suppliers");

const groups = new Map();
const findRows = PRODUCTS.map((p, i) => {
  const [si, title, key, cat, fob, cur, moq, lead, w, dims, gut, demo, gift, comp, logo] = p;
  if (!groups.has(key)) groups.set(key, randomUUID());
  const who = people[i % people.length];
  return {
    id: randomUUID(), supplier_id: sid[si], captured_by: who.id, created_by: who.id,
    captured_at: new Date(now - (PRODUCTS.length - i) * 37 * 60_000).toISOString(),
    hall: SUPPLIERS[si][3], booth_code: SUPPLIERS[si][2],
    transcript: `${TAG} ${title}, ${fob} ${cur === "CNY" ? "RMB" : "dollars"}, MOQ ${moq}, lead time ${lead} days${logo ? ", logo ok" : ""}`,
    gut, title_ai: title, description_ai: `${title}. Demo data for trying the app.`, category_ai: cat, tags_ai: key.split(" "),
    fob_price_cents: Math.round(fob * 100), fob_currency: cur, moq, lead_time_days: lead, unit_weight_g: w, box_dims_mm: dims,
    fragile: false, giftable_ai: gift, demo_score_ai: demo, oem_logo: logo, compliance_ai: { risk: comp, flags: comp === "hard" ? (cat.includes("Kids") || cat.includes("Baby") ? ["CPC (children's product)"] : ["FCC"]) : [] },
    hts_guess_ai: cat.includes("light") ? "9405.49" : null, product_key_ai: key, product_group_id: groups.get(key),
    processing_state: "done", stage: gut === "fire" ? "shortlisted" : "found", certifications: [],
  };
});
must(await sb.from("finds").insert(findRows), "insert finds");

must(await sb.from("research").insert(PRODUCTS.map((p, i) => ({
  find_id: findRows[i].id, status: "done", retail_low_cents: p[15] * 100, retail_high_cents: p[16] * 100, competition: p[17],
  ip_risk: "low", summary: `Demo research: sells for $${p[15]}-$${p[16]} in the US; competition ${p[17]}.`,
  report: { comparables: [], retail_low_usd: p[15], retail_high_usd: p[16], competition: p[17], competition_notes: "demo", trend_notes: "demo data", cheaper_source_found: false, cheaper_source_notes: null, ip_risk: "low", ip_notes: "demo", summary: "demo" },
  sources: [],
}))), "insert research");

const votes = [];
findRows.forEach((f, i) => people.forEach((p, k) => { if ((i + k) % 3 !== 0) votes.push({ id: randomUUID(), find_id: f.id, user_id: p.id, value: f.gut === "fire" ? 2 : f.gut === "good" ? 1 : -1 }); }));
must(await sb.from("votes").insert(votes), "insert votes");

console.log(`added ${findRows.length} demo finds from ${SUPPLIERS.length} suppliers (${[...groups.values()].length} distinct products).`);
console.log("The worker scores them within a minute or two. Remove later with --wipe.");
