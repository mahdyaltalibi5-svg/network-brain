import { config } from "../config";
import { graphAll } from "./graph";

export type CampaignSpend = {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
};

export const DATE_PRESETS = { last_7d: "Last 7 days", last_30d: "Last 30 days", last_90d: "Last 90 days", this_month: "This month", last_month: "Last month" } as const;
export type DatePreset = keyof typeof DATE_PRESETS;
export const isDatePreset = (v: unknown): v is DatePreset => typeof v === "string" && v in DATE_PRESETS;

/** Campaign-level spend from the ad account (Marketing API insights). */
export async function fetchCampaignSpend(preset: DatePreset): Promise<CampaignSpend[]> {
  const account = config.meta.adAccountId();
  const token = config.meta.adsToken();
  if (!account || !token) throw new Error("META_AD_ACCOUNT_ID and an ads token are required");
  const rows = await graphAll<{ campaign_id: string; campaign_name: string; spend?: string; impressions?: string; clicks?: string }>(
    `${account}/insights`,
    { token, params: { level: "campaign", fields: "campaign_id,campaign_name,spend,impressions,clicks", date_preset: preset, limit: "200" } },
  );
  return rows.map((r) => ({
    campaignId: r.campaign_id,
    campaignName: r.campaign_name,
    spend: Number(r.spend ?? 0),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
  }));
}

/** The window a Meta date preset covers, so CRM leads can be counted over the same days. */
export function presetRange(preset: DatePreset, now = new Date()): { since: Date; until: Date } {
  const day = 86_400_000;
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  switch (preset) {
    case "last_7d":
      return { since: new Date(startOfDay.getTime() - 7 * day), until: startOfDay };
    case "last_30d":
      return { since: new Date(startOfDay.getTime() - 30 * day), until: startOfDay };
    case "last_90d":
      return { since: new Date(startOfDay.getTime() - 90 * day), until: startOfDay };
    case "this_month":
      return { since: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), until: now };
    case "last_month":
      return {
        since: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
        until: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      };
  }
}

export type FunnelCounts = { leads: number; booked: number; ordered: number; revenueCents: number };
export type CampaignRow = CampaignSpend &
  FunnelCounts & { costPerLead: number | null; costPerBooking: number | null; costPerOrder: number | null; roas: number | null };

const div = (a: number, b: number) => (b > 0 ? a / b : null);

/** Joins Meta spend with CRM outcomes per campaign. Campaigns with leads but no spend still show. */
export function joinCampaigns(spend: CampaignSpend[], funnel: Map<string, FunnelCounts & { name: string | null }>): CampaignRow[] {
  const ids = new Set([...spend.map((s) => s.campaignId), ...funnel.keys()]);
  return [...ids]
    .map((id) => {
      const s = spend.find((x) => x.campaignId === id);
      const f = funnel.get(id) ?? { leads: 0, booked: 0, ordered: 0, revenueCents: 0, name: null };
      const cost = s?.spend ?? 0;
      return {
        campaignId: id,
        campaignName: s?.campaignName ?? f.name ?? id,
        spend: cost,
        impressions: s?.impressions ?? 0,
        clicks: s?.clicks ?? 0,
        leads: f.leads,
        booked: f.booked,
        ordered: f.ordered,
        revenueCents: f.revenueCents,
        costPerLead: div(cost, f.leads),
        costPerBooking: div(cost, f.booked),
        costPerOrder: div(cost, f.ordered),
        roas: div(f.revenueCents / 100, cost),
      };
    })
    .sort((a, b) => b.spend - a.spend || b.leads - a.leads);
}
