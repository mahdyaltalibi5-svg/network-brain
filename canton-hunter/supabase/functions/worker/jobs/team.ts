import { ContentPack } from "@core";
import { extract, text } from "../../_shared/claude.ts";
import { db, must, nowIso, type Row } from "../../_shared/db.ts";
import { pushTeam } from "../../_shared/push.ts";

const title = (f: Row) => f.title_override ?? f.title_ai ?? "New find";

/** Asia/Shanghai calendar day [start, end) in UTC ISO. */
function cstDayRange(date: string): [string, string] {
  const start = new Date(`${date}T00:00:00+08:00`);
  return [start.toISOString(), new Date(start.getTime() + 86400_000).toISOString()];
}

export async function sendPing(payload: { ping_id: string }): Promise<Row> {
  const sb = db();
  const ping = must(await sb.from("pings").select("*").eq("id", payload.ping_id).single(), "ping") as Row;
  const from = (await sb.from("profiles").select("name").eq("id", ping.from_user).maybeSingle()).data as Row | null;
  const find = ping.find_id ? (await sb.from("finds").select("*").eq("id", ping.find_id).maybeSingle()).data as Row | null : null;
  const where = [ping.hall && `Hall ${ping.hall}`, ping.booth_code].filter(Boolean).join(" · ");
  const ageMin = Math.round((Date.now() - Date.parse(ping.sent_at)) / 60000);
  const sent = await pushTeam({
    title: `👀 ${from?.name ?? "Teammate"}: come look${where ? ` — ${where}` : ""}`,
    body: [ping.message, find ? title(find) : null, ageMin > 5 ? `(sent ${ageMin} min ago, was offline)` : null].filter(Boolean).join(" · "),
    data: { type: "ping", find_id: ping.find_id },
  }, { exclude: ping.from_user });
  must(await sb.from("pings").update({ delivered_at: nowIso() }).eq("id", ping.id), "ping delivered");
  return { sent };
}

export async function morningDigest(): Promise<Row> {
  const sb = db();
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const finds = must(await sb.from("finds").select("id,title_ai,title_override").gte("captured_at", since).is("deleted_at", null), "finds") as Row[];
  if (!finds.length) return { skipped: "no finds" };
  const scores = must(await sb.from("scores").select("find_id,total,rank_key").in("find_id", finds.map((f) => f.id)).order("rank_key", { ascending: false }).limit(5), "scores") as Row[];
  const byId = new Map(finds.map((f) => [f.id, f]));
  const top = scores.map((s, i) => `${i + 1}. ${title(byId.get(s.find_id)!)} (${Math.round(s.total)})`).join("\n");
  await pushTeam({ title: `☀️ ${finds.length} finds yesterday`, body: top || "Scores are still computing.", data: { type: "digest" } });
  return { finds: finds.length };
}

const CONTENT_SYSTEM = `You write short-form video content for a brand TikTok/Instagram account run by three guys from Utah
who flew to the Canton Fair in China to find products. The vibe is honest, fun, "look what we found" — not salesy.
For each clip you get the product and what was said. Write 3 scroll-stopping hooks (first 1-2 seconds, under 10 words),
a caption (1-2 lines), 5-8 hashtags (no #fyp spam), short on-screen text, and a post order (1 = post first).
Also write one "day recap" script (30-45 seconds, spoken, with shot notes) covering the best finds of the day.
Use the media_id values exactly as given.`;

export async function contentPack(payload: { date?: string }): Promise<Row> {
  const sb = db();
  const date = payload.date ?? new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  const [from, to] = cstDayRange(date);
  const finds = must(await sb.from("finds").select("*").gte("captured_at", from).lt("captured_at", to).is("deleted_at", null), "finds") as Row[];
  if (!finds.length) return { skipped: "no finds" };
  const ids = finds.map((f) => f.id);
  const videos = must(await sb.from("media").select("id,find_id,created_by").eq("kind", "video").eq("upload_state", "uploaded")
    .in("find_id", ids).is("deleted_at", null), "videos") as Row[];
  if (!videos.length) return { skipped: "no videos" };
  const scores = must(await sb.from("scores").select("find_id,total").in("find_id", ids), "scores") as Row[];
  const scoreOf = new Map(scores.map((s) => [s.find_id, s.total as number]));
  const byId = new Map(finds.map((f) => [f.id, f]));
  const gutPts: Record<string, number> = { fire: 15, good: 5, meh: 0 };

  // best video per find, rank by score + gut, spread across people (max 3 per person)
  const perFind = new Map<string, Row>();
  for (const v of videos) if (!perFind.has(v.find_id)) perFind.set(v.find_id, v);
  const ranked = [...perFind.values()].sort((a, b) => {
    const fa = byId.get(a.find_id)!, fb = byId.get(b.find_id)!;
    return (scoreOf.get(b.find_id) ?? 50) + (gutPts[fb.gut] ?? 0) - ((scoreOf.get(a.find_id) ?? 50) + (gutPts[fa.gut] ?? 0));
  });
  const perPerson = new Map<string, number>();
  const picked: Row[] = [];
  for (const v of ranked) {
    const n = perPerson.get(v.created_by) ?? 0;
    if (n >= 3) continue;
    perPerson.set(v.created_by, n + 1);
    picked.push(v);
    if (picked.length >= 8) break;
  }

  const lines = picked.map((v) => {
    const f = byId.get(v.find_id)!;
    return `media_id=${v.id} | product: ${title(f)} | ${f.description_ai ?? ""} | price: ${f.fob_price_cents != null ? (f.fob_price_cents / 100).toFixed(2) + " " + (f.fob_currency ?? "USD") : "?"} | said: ${(f.transcript ?? "").slice(0, 300)}`;
  });
  const { data, usage } = await extract({
    system: CONTENT_SYSTEM,
    content: [text(`DATE: ${date} (Canton Fair day)\nCLIPS:\n${lines.join("\n")}`)],
    schema: ContentPack,
    effort: "medium",
  });

  // replace unposted items for the day
  await sb.from("content_items").update({ deleted_at: nowIso() }).eq("date", date).eq("posted", false).is("deleted_at", null);
  const valid = new Set(picked.map((p) => p.id));
  const rows: Row[] = data.clips.filter((c) => valid.has(c.media_id)).map((c) => ({
    date, media_id: c.media_id, kind: "clip", hooks: c.hooks, caption: c.caption, hashtags: c.hashtags,
    on_screen_text: c.on_screen_text, post_order: Math.round(c.post_order),
  }));
  rows.push({ date, kind: "recap", script: data.day_recap_script, post_order: 99 });
  must(await sb.from("content_items").insert(rows), "insert content");
  await pushTeam({ title: "🎬 Content pack ready", body: `${rows.length - 1} clips + a day recap for ${date}`, data: { type: "content" } });
  return { clips: rows.length - 1, usage };
}

const EXPORT_TABLES = ["profiles", "config", "hunt_items", "hall_assignments", "suppliers", "finds", "media", "votes", "pings", "followups",
  "research", "cost_calcs", "scores", "pipeline_events", "vetting", "samples", "content_items", "launches", "launch_metrics"];

function toCsv(rows: Row[], cols: string[]): string {
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export async function exportBackup(): Promise<Row> {
  const sb = db();
  const date = new Date().toISOString().slice(0, 10);
  const dump: Record<string, Row[]> = {};
  const counts: Record<string, number> = {};
  for (const t of EXPORT_TABLES) {
    const all: Row[] = [];
    for (let from = 0; ; from += 1000) {
      const page = must(await sb.from(t).select("*").range(from, from + 999), `export ${t}`) as Row[];
      all.push(...page.map(({ search_doc: _s, ...r }) => r));
      if (page.length < 1000) break;
    }
    dump[t] = all;
    counts[t] = all.length;
  }
  const put = async (name: string, body: string, type: string) => {
    const { error } = await sb.storage.from("exports").upload(`${date}/${name}`, new Blob([body], { type }), { upsert: true, contentType: type });
    if (error) throw new Error(`upload ${name}: ${error.message}`);
  };
  await put("all.json", JSON.stringify(dump), "application/json");
  await put("finds.csv", toCsv(dump.finds, ["id", "captured_at", "hall", "booth_code", "title_ai", "title_override", "category_ai", "fob_price_cents", "fob_currency", "moq", "lead_time_days", "gut", "stage", "supplier_id", "transcript"]), "text/csv");
  await put("suppliers.csv", toCsv(dump.suppliers, ["id", "name_en", "name_cn", "contact_name", "phones", "emails", "wechat_id", "booth_code", "hall", "website", "notes"]), "text/csv");
  await put("samples.csv", toCsv(dump.samples, ["id", "find_id", "supplier_id", "status", "carried_by", "bag_label", "paid_cents", "declared_value_cents", "tracking"]), "text/csv");
  must(await sb.from("exports").insert({ date, storage_path: `exports/${date}/`, row_counts: counts }), "export row");
  return counts;
}
