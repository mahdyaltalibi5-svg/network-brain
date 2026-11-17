import { getDb } from "../db";
import type { CampaignSpend } from "./insights";

/** Reads the synced ad account (meta_ads + meta_daily) for a date range [since, until). */
const d = (x: Date) => x.toISOString().slice(0, 10);

export async function hasSyncedAds() {
  const db = await getDb();
  return Number((await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM meta_ads`))[0].n) > 0;
}

export async function campaignSpend(since: Date, until: Date): Promise<(CampaignSpend & { metaLeads: number; status: string | null })[]> {
  const db = await getDb();
  const rows = await db.query<Record<string, unknown>>(
    `SELECT c.id, c.name, c.status,
            COALESCE(SUM(m.spend_cents), 0)::bigint AS spend, COALESCE(SUM(m.impressions), 0)::bigint AS impressions,
            COALESCE(SUM(m.clicks), 0)::bigint AS clicks, COALESCE(SUM(m.leads), 0)::bigint AS leads
     FROM meta_ads c
     LEFT JOIN meta_daily m ON m.campaign_id = c.id AND m.day >= $1 AND m.day < $2
     WHERE c.level = 'campaign'
     GROUP BY c.id, c.name, c.status
     HAVING COALESCE(SUM(m.spend_cents), 0) > 0 OR c.status = 'ACTIVE'`,
    [d(since), d(until)],
  );
  return rows.map((r) => ({
    campaignId: String(r.id),
    campaignName: String(r.name),
    status: (r.status as string) ?? null,
    spend: Number(r.spend) / 100,
    impressions: Number(r.impressions),
    clicks: Number(r.clicks),
    metaLeads: Number(r.leads),
  }));
}

export type AdRow = {
  id: string;
  name: string;
  status: string | null;
  campaign: string | null;
  thumbnail: string | null;
  headline: string | null;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  metaLeads: number;
  leads: number;
  booked: number;
  ordered: number;
  revenueCents: number;
};

/** Every ad that spent in the range (or is running), with Meta's numbers and the CRM's outcomes. */
export async function adRows(since: Date, until: Date): Promise<AdRow[]> {
  const db = await getDb();
  const rows = await db.query<Record<string, unknown>>(
    `WITH perf AS (
       SELECT ad_id, SUM(spend_cents) AS spend, SUM(impressions) AS impressions, SUM(reach) AS reach, SUM(clicks) AS clicks, SUM(leads) AS leads
       FROM meta_daily WHERE day >= $1 AND day < $2 GROUP BY ad_id
     ), crm AS (
       SELECT ad_id, COUNT(*) AS leads, COUNT(booked_at) AS booked, COUNT(ordered_at) AS ordered,
              COALESCE(SUM(CASE WHEN ordered_at IS NOT NULL THEN value_cents END), 0) AS revenue
       FROM leads WHERE ad_id IS NOT NULL AND lead_created_at >= $1::date AND lead_created_at < $2::date GROUP BY ad_id
     )
     SELECT a.id, a.name, a.status, a.thumbnail_url, a.headline, c.name AS campaign,
            COALESCE(p.spend, 0)::bigint AS spend, COALESCE(p.impressions, 0)::bigint AS impressions, COALESCE(p.reach, 0)::bigint AS reach,
            COALESCE(p.clicks, 0)::bigint AS clicks, COALESCE(p.leads, 0)::bigint AS meta_leads,
            COALESCE(k.leads, 0)::int AS leads, COALESCE(k.booked, 0)::int AS booked, COALESCE(k.ordered, 0)::int AS ordered, COALESCE(k.revenue, 0)::bigint AS revenue
     FROM meta_ads a
     LEFT JOIN meta_ads c ON c.id = a.campaign_id AND c.level = 'campaign'
     LEFT JOIN perf p ON p.ad_id = a.id
     LEFT JOIN crm k ON k.ad_id = a.id
     WHERE a.level = 'ad' AND (COALESCE(p.spend, 0) > 0 OR a.status = 'ACTIVE' OR COALESCE(k.leads, 0) > 0)
     ORDER BY COALESCE(p.spend, 0) DESC, a.name`,
    [d(since), d(until)],
  );
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    status: (r.status as string) ?? null,
    campaign: (r.campaign as string) ?? null,
    thumbnail: (r.thumbnail_url as string) ?? null,
    headline: (r.headline as string) ?? null,
    spend: Number(r.spend) / 100,
    impressions: Number(r.impressions),
    reach: Number(r.reach),
    clicks: Number(r.clicks),
    metaLeads: Number(r.meta_leads),
    leads: Number(r.leads),
    booked: Number(r.booked),
    ordered: Number(r.ordered),
    revenueCents: Number(r.revenue),
  }));
}
