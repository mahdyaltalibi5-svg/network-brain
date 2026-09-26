import { evaluateKillRules, LaunchPlan, type KillRules } from "@core";
import { extract, text } from "../../_shared/claude.ts";
import { loadConfig } from "../../_shared/config.ts";
import { db, must, nowIso, type Row } from "../../_shared/db.ts";
import * as meta from "../../_shared/meta.ts";
import { pushTeam } from "../../_shared/push.ts";
import * as shopify from "../../_shared/shopify.ts";
import { downloadBase64, signedUrl } from "../../_shared/storage.ts";

const title = (f: Row) => f.title_override ?? f.title_ai ?? "Product";

async function loadLaunch(id: string): Promise<{ launch: Row; find: Row }> {
  const sb = db();
  const launch = must(await sb.from("launches").select("*").eq("id", id).single(), "launch") as Row;
  const find = must(await sb.from("finds").select("*").eq("id", launch.find_id).single(), "find") as Row;
  return { launch, find };
}

async function setLaunch(id: string, patch: Row) {
  must(await db().from("launches").update(patch).eq("id", id), "update launch");
}

/**
 * Record a readable error on the launch, then rethrow so the job records it too.
 * keepStatus: don't change status (e.g. a failed pause must not hide that ads are still running).
 */
async function guard<T>(launchId: string, fn: () => Promise<T>, opts: { keepStatus?: boolean } = {}): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const msg = String((e as Error).message ?? e).slice(0, 1000);
    await setLaunch(launchId, opts.keepStatus ? { last_error: `Action failed, ads may still be running: ${msg}` } : { status: "error", last_error: msg });
    throw e;
  }
}

const PLAN_SYSTEM = `You are the launch strategist for a small US DTC team testing products found at the Canton Fair.
Each product gets ONE landing page on an umbrella Shopify store and a $10/day Meta test for 5-7 days.
We do not have inventory yet, so the offer is either:
- "waitlist": collect emails ("Get notified / early-bird price"), no payment. Default when lead time is long or margin is unclear.
- "preorder": take payment now with an honest ship-by date. Only when margin is strong and ship date is reliable.
Write direct-response copy that is specific and honest (no fake scarcity, no fake reviews, no medical/health claims).
Ad scripts must be shootable by 3 guys with an iPhone (UGC style: hook in the first 2 seconds, show the product working).
Mark uses_existing_footage true when the fair footage we have is enough. Price at a clean retail number.`;

export async function launchPlan(payload: { launch_id: string }): Promise<Row> {
  const sb = db();
  const { launch, find } = await loadLaunch(payload.launch_id);
  return guard(launch.id, async () => {
    const cfg = await loadConfig();
    const research = (await sb.from("research").select("*").eq("find_id", find.id).maybeSingle()).data as Row | null;
    const score = (await sb.from("scores").select("*").eq("find_id", find.id).maybeSingle()).data as Row | null;
    const calc = (await sb.from("cost_calcs").select("outputs").eq("find_id", find.id).maybeSingle()).data as Row | null;
    const media = must(await sb.from("media").select("kind").eq("find_id", find.id).eq("upload_state", "uploaded").is("deleted_at", null), "media") as Row[];
    const count = (k: string) => media.filter((m) => m.kind === k).length;
    const ctx = {
      product: { title: title(find), description: find.description_override ?? find.description_ai, category: find.category_ai, tags: find.tags_ai,
        transcript: find.transcript, giftable: find.giftable_ai, compliance: find.compliance_override ?? find.compliance_ai },
      supplier_terms: { fob_cents: find.fob_price_cents, currency: find.fob_currency, moq: find.moq, lead_time_days: find.lead_time_days, custom_logo: find.oem_logo },
      research: research?.report ?? null,
      landed_cost: calc?.outputs ?? null,
      score: score ? { total: score.total, gates_failed: score.gates_failed } : null,
      footage: { product_photos: count("product_photo"), videos: count("video") },
      budget: { daily_usd: cfg.meta_daily_budget_cents / 100, days: cfg.kill_rules_default.max_days },
    };
    const { data: plan, usage } = await extract({
      system: PLAN_SYSTEM,
      content: [text(JSON.stringify(ctx, null, 2))],
      schema: LaunchPlan,
      effort: "high",
    });
    const arrive = (calc?.outputs as Row | null)?.arrive_by as string | undefined;
    const shipBy = new Date(arrive ? Date.parse(arrive) + 7 * 86400_000 : Date.now() + 45 * 86400_000).toISOString().slice(0, 10);
    await setLaunch(launch.id, {
      plan, status: "plan_ready", mode: plan.offer.mode, price_cents: Math.round(plan.offer.price_usd * 100),
      ship_by_date: launch.ship_by_date ?? shipBy, kill_rules: launch.kill_rules ?? cfg.kill_rules_default, last_error: null,
    });
    await pushTeam({ title: "📝 Launch plan ready", body: `${title(find)}: review and approve`, data: { type: "launch", launch_id: launch.id } });
    return { usage };
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

/** Build the Shopify page and the PAUSED Meta campaign. Idempotent: skips parts that already exist. */
export async function launchBuild(payload: { launch_id: string }): Promise<Row> {
  const sb = db();
  const { launch, find } = await loadLaunch(payload.launch_id);
  return guard(launch.id, async () => {
    const cfg = await loadConfig();
    const plan = LaunchPlan.parse(launch.plan);
    const mode = (launch.mode ?? plan.offer.mode) as "waitlist" | "preorder";
    const priceUsd = (launch.price_cents ?? Math.round(plan.offer.price_usd * 100)) / 100;
    const photos = must(await sb.from("media").select("*").eq("find_id", find.id).eq("kind", "product_photo").eq("upload_state", "uploaded").is("deleted_at", null), "photos") as Row[];
    const videos = must(await sb.from("media").select("*").eq("find_id", find.id).eq("kind", "video").eq("upload_state", "uploaded").is("deleted_at", null), "videos") as Row[];
    const notes: string[] = [];
    let { landing_url, shopify_product_id, shopify_handle } = launch;

    if (!shopify_product_id) {
      if (!shopify.shopifyConfigured()) throw new Error("Shopify is not configured (SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_TOKEN)");
      const shipByText = new Date(`${launch.ship_by_date}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
      const imageUrls = await Promise.all(photos.slice(0, 6).map((p) => signedUrl(p.storage_path, 3600)));
      const desc = `<p>${escapeHtml(plan.copy.description)}</p><ul>${plan.copy.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`;
      const created = await shopify.createTestProduct({
        title: plan.copy.title,
        handle: `${shopify.slugify(plan.copy.title)}-${launch.id.slice(0, 4)}`,
        descriptionHtml: desc,
        priceUsd,
        compareAtUsd: plan.offer.compare_at_usd,
        mode,
        shipByText,
        imageUrls,
        metafields: { angles: plan.angles, faq: plan.copy.faq, bullets: plan.copy.bullets, positioning: plan.positioning },
      });
      ({ productId: shopify_product_id, handle: shopify_handle, url: landing_url } = created);
      await setLaunch(launch.id, { shopify_product_id, shopify_handle, landing_url });
    }

    if (!launch.meta_campaign_id) {
      if (!meta.metaConfigured()) {
        notes.push("Meta not configured: landing page only");
      } else {
        const creatives: meta.CampaignBuild["creatives"] = [];
        const texts = plan.meta.primary_texts;
        const heads = plan.meta.headlines;
        const thumb = photos[0] ? await signedUrl(photos[0].storage_path, 3600) : undefined;
        for (const [i, v] of videos.slice(0, 2).entries()) {
          const videoId = await meta.uploadVideo(await signedUrl(v.storage_path, 3600), `${plan.copy.title} ${i + 1}`);
          creatives.push({ videoId, thumbnailUrl: thumb, primaryText: texts[i % texts.length]!, headline: heads[i % heads.length]! });
        }
        for (const p of photos.slice(0, Math.max(1, 3 - creatives.length))) {
          const { data } = await downloadBase64(p.storage_path);
          const imageHash = await meta.uploadImage(data);
          const i = creatives.length;
          creatives.push({ imageHash, primaryText: texts[i % texts.length]!, headline: heads[i % heads.length]! });
        }
        if (!creatives.length) throw new Error("No photos or videos uploaded for this product");
        const built = await meta.buildPausedCampaign({
          name: `CH · ${plan.copy.title.slice(0, 40)}`,
          mode,
          dailyBudgetCents: cfg.meta_daily_budget_cents,
          link: landing_url!,
          creatives,
        });
        await setLaunch(launch.id, { meta_campaign_id: built.campaignId, meta_adset_id: built.adsetId, meta_ad_ids: built.adIds, meta_status: "paused" });
      }
    }
    await setLaunch(launch.id, { status: "built", last_error: notes.join("; ") || null });
    await pushTeam({ title: "🛠️ Launch built (paused)", body: `${title(find)}: page is live, ads are PAUSED until someone taps Go live`, data: { type: "launch", launch_id: launch.id } });
    return { landing_url, notes };
  });
}

export async function launchActivate(payload: { launch_id: string; by: string }): Promise<Row> {
  const { launch } = await loadLaunch(payload.launch_id);
  return guard(launch.id, async () => {
    if (!launch.meta_campaign_id) throw new Error("No campaign to activate");
    // ads + ad set first, campaign last, so nothing runs half-configured
    await meta.setStatus([...launch.meta_ad_ids, launch.meta_adset_id], "ACTIVE");
    await meta.setStatus([launch.meta_campaign_id], "ACTIVE");
    await setLaunch(launch.id, { meta_status: "active", status: "live", activated_by: payload.by, activated_at: nowIso(), last_error: null });
    const who = (await db().from("profiles").select("name").eq("id", payload.by).maybeSingle()).data as Row | null;
    await pushTeam({ title: "🚀 Ads are LIVE", body: `${who?.name ?? "Someone"} turned on the $${(launch.price_cents ?? 0) / 100} test`, data: { type: "launch", launch_id: launch.id } });
    return { ok: true };
  });
}

export async function launchPause(payload: { launch_id: string; by: string; kill?: boolean }): Promise<Row> {
  const { launch } = await loadLaunch(payload.launch_id);
  return guard(launch.id, async () => {
    if (launch.meta_campaign_id) await meta.setStatus([launch.meta_campaign_id], "PAUSED");
    await setLaunch(launch.id, { meta_status: launch.meta_campaign_id ? "paused" : "none", status: payload.kill ? "killed" : "paused", last_error: null });
    if (payload.kill) {
      const sb = db();
      must(await sb.from("finds").update({ stage: "killed", killed_reason: "Ad test killed" }).eq("id", launch.find_id), "kill find");
    }
    return { ok: true };
  }, { keepStatus: true });
}

/** Daily: pull Meta + Shopify numbers, evaluate kill rules, notify. Never pauses or scales on its own. */
export async function metricsPull(payload: { launch_id?: string }): Promise<Row> {
  const sb = db();
  // include "error" launches: a failed pause can leave ads running, and they must stay monitored
  let q = sb.from("launches").select("*").is("deleted_at", null).in("status", ["live", "paused", "built", "error"]);
  if (payload.launch_id) q = q.eq("id", payload.launch_id);
  const launches = must(await q, "launches") as Row[];
  const today = new Date().toISOString().slice(0, 10);
  const results: Row[] = [];
  for (const l of launches) {
    try {
      const since = (l.activated_at ?? l.created_at).slice(0, 10);
      const days = l.meta_campaign_id && meta.metaConfigured() ? await meta.campaignInsights(l.meta_campaign_id, since, today) : [];
      for (const d of days) {
        must(await sb.from("launch_metrics").upsert({
          launch_id: l.id, date: d.date, spend_cents: d.spend_cents, impressions: d.impressions, clicks: d.clicks, lp_views: d.lp_views, updated_at: nowIso(),
        }, { onConflict: "launch_id,date" }), "metrics upsert");
      }
      // Shopify counts are cumulative, stored on today's row.
      let signups = 0, preorders = 0, revenue = 0;
      if (shopify.shopifyConfigured() && l.shopify_handle) {
        if (l.mode === "waitlist") signups = await shopify.countWaitlist(l.shopify_handle);
        else {
          const r = await shopify.countPreorders(l.shopify_product_id, since);
          preorders = r.orders; revenue = r.revenueCents;
        }
      }
      const all = must(await sb.from("launch_metrics").select("*").eq("launch_id", l.id), "metrics") as Row[];
      const totals = {
        spend_cents: all.reduce((a, r) => a + r.spend_cents, 0),
        impressions: all.reduce((a, r) => a + r.impressions, 0),
        clicks: all.reduce((a, r) => a + r.clicks, 0),
        waitlist_signups: signups,
        preorders,
        days_running: l.activated_at ? Math.floor((Date.now() - Date.parse(l.activated_at)) / 86400_000) : 0,
      };
      const calc = (await sb.from("cost_calcs").select("outputs").eq("find_id", l.find_id).maybeSingle()).data as Row | null;
      const grossCents = Math.round(((calc?.outputs as Row | null)?.gross_margin_usd ?? 10) * 100);
      const rules = (l.kill_rules ?? (await loadConfig()).kill_rules_default) as KillRules;
      const ev = evaluateKillRules(totals, rules, grossCents, (l.mode ?? "waitlist") as "waitlist" | "preorder");
      const prev = must(await sb.from("launch_metrics").select("recommendation").eq("launch_id", l.id).lt("date", today).order("date", { ascending: false }).limit(1), "prev") as Row[];
      must(await sb.from("launch_metrics").upsert({
        launch_id: l.id, date: today, waitlist_signups: signups, preorders, revenue_cents: revenue,
        recommendation: ev.recommendation, reasons: ev.reasons, updated_at: nowIso(),
      }, { onConflict: "launch_id,date" }), "today metrics");
      if ((l.status === "live" || l.meta_status === "active") && ev.recommendation !== "keep" && prev[0]?.recommendation !== ev.recommendation) {
        const f = (await sb.from("finds").select("title_ai,title_override").eq("id", l.find_id).single()).data as Row;
        await pushTeam({
          title: ev.recommendation === "kill" ? `🛑 Recommend KILL: ${title(f)}` : `📈 Recommend SCALE: ${title(f)}`,
          body: `${ev.reasons.join("; ")} · $${(totals.spend_cents / 100).toFixed(0)} spent. Open the app to act.`,
          data: { type: "launch", launch_id: l.id },
        });
      }
      results.push({ launch_id: l.id, recommendation: ev.recommendation });
    } catch (e) {
      console.error("metrics", l.id, e);
      results.push({ launch_id: l.id, error: String((e as Error).message) });
    }
  }
  return { results };
}
