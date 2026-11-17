import { getDb } from "../db";
import { readSettings, writeSettings } from "../vault";
import { metaCreds } from "./creds";
import { graphAll } from "./graph";

/**
 * Mirrors the ad account into the CRM: campaigns, ad sets and ads (status, budget, creative)
 * plus each ad's spend, reach, clicks and leads per day. Runs by itself: after connecting
 * (90-day backfill), from the daily job, and whenever the app is opened (at most hourly).
 */
type Obj = { id: string; name: string; status?: string; effective_status?: string; campaign_id?: string; adset_id?: string; objective?: string; daily_budget?: string; lifetime_budget?: string };
type Ad = Obj & { creative?: { thumbnail_url?: string; title?: string; body?: string } };
type Row = { date_start: string; ad_id: string; campaign_id?: string; adset_id?: string; spend?: string; impressions?: string; reach?: string; clicks?: string; actions?: { action_type: string; value: string }[] };

const LEAD_ACTIONS = ["lead", "onsite_conversion.lead_grouped", "leadgen_grouped", "offsite_conversion.fb_pixel_lead"];
export const leadsFromActions = (actions: Row["actions"] = []) =>
  Math.max(0, ...actions.filter((a) => LEAD_ACTIONS.includes(a.action_type)).map((a) => Number(a.value) || 0));

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const int = (v?: string) => (v == null || v === "" ? null : Math.round(Number(v)));

export async function syncAdStructure(account: string, token: string) {
  const fields = "id,name,status,effective_status";
  const [campaigns, adsets, ads] = await Promise.all([
    graphAll<Obj>(`${account}/campaigns`, { token, params: { fields: `${fields},objective,daily_budget,lifetime_budget`, limit: "200" } }),
    graphAll<Obj>(`${account}/adsets`, { token, params: { fields: `${fields},campaign_id,daily_budget,lifetime_budget`, limit: "200" } }),
    graphAll<Ad>(`${account}/ads`, { token, params: { fields: `${fields},campaign_id,adset_id,creative{thumbnail_url,title,body}`, limit: "200" } }),
  ]);
  const db = await getDb();
  const up = async (level: string, o: Ad) =>
    db.query(
      `INSERT INTO meta_ads (id, level, name, status, campaign_id, adset_id, objective, daily_budget, lifetime_budget, thumbnail_url, headline, body, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, campaign_id = EXCLUDED.campaign_id, adset_id = EXCLUDED.adset_id,
         objective = EXCLUDED.objective, daily_budget = EXCLUDED.daily_budget, lifetime_budget = EXCLUDED.lifetime_budget,
         thumbnail_url = EXCLUDED.thumbnail_url, headline = EXCLUDED.headline, body = EXCLUDED.body, synced_at = now()`,
      [o.id, level, o.name, o.effective_status ?? o.status ?? null, level === "campaign" ? o.id : (o.campaign_id ?? null), level === "ad" ? (o.adset_id ?? null) : level === "adset" ? o.id : null,
       o.objective ?? null, int(o.daily_budget), int(o.lifetime_budget), o.creative?.thumbnail_url ?? null, o.creative?.title ?? null, o.creative?.body ?? null],
    );
  for (const c of campaigns) await up("campaign", c);
  for (const a of adsets) await up("adset", a);
  for (const a of ads) await up("ad", a);
  return { campaigns: campaigns.length, adsets: adsets.length, ads: ads.length };
}

export async function syncInsights(account: string, token: string, days: number) {
  const until = new Date();
  const since = new Date(until.getTime() - days * 86_400_000);
  const rows = await graphAll<Row>(
    `${account}/insights`,
    {
      token,
      params: {
        level: "ad",
        time_increment: "1",
        time_range: JSON.stringify({ since: ymd(since), until: ymd(until) }),
        fields: "ad_id,adset_id,campaign_id,spend,impressions,reach,clicks,actions",
        limit: "500",
      },
    },
    40,
  );
  const db = await getDb();
  for (const r of rows) {
    await db.query(
      `INSERT INTO meta_daily (day, ad_id, campaign_id, adset_id, spend_cents, impressions, reach, clicks, leads)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (day, ad_id) DO UPDATE SET campaign_id = EXCLUDED.campaign_id, adset_id = EXCLUDED.adset_id, spend_cents = EXCLUDED.spend_cents,
         impressions = EXCLUDED.impressions, reach = EXCLUDED.reach, clicks = EXCLUDED.clicks, leads = EXCLUDED.leads`,
      [r.date_start, r.ad_id, r.campaign_id ?? null, r.adset_id ?? null, Math.round(Number(r.spend ?? 0) * 100), Number(r.impressions ?? 0), Number(r.reach ?? 0), Number(r.clicks ?? 0), leadsFromActions(r.actions)],
    );
  }
  return rows.length;
}

/** Hourly at most unless forced. The first run looks back 90 days; later runs re-pull the last 3 (Meta revises recent days). */
export async function syncAds({ force = false, days }: { force?: boolean; days?: number } = {}) {
  const m = await metaCreds();
  if (!m.adAccountId || !m.adsToken) return { skipped: true as const };
  const s = await readSettings("meta.ads_synced_at");
  const last = s["meta.ads_synced_at"] ? Date.parse(s["meta.ads_synced_at"]) : 0;
  if (!force && Date.now() - last < 60 * 60_000) return { skipped: true as const };
  await writeSettings({ "meta.ads_synced_at": new Date().toISOString() }); // claim the slot first so parallel requests don't double-sync
  try {
    const structure = await syncAdStructure(m.adAccountId, m.adsToken);
    const rows = await syncInsights(m.adAccountId, m.adsToken, days ?? (last ? 3 : 90));
    await writeSettings({ "meta.ads_error": null });
    return { skipped: false as const, ...structure, rows };
  } catch (e) {
    await writeSettings({ "meta.ads_error": e instanceof Error ? e.message : String(e) });
    throw e;
  }
}
