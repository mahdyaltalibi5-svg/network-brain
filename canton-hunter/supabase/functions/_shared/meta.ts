import { env, envOpt } from "./env.ts";

/**
 * Meta Marketing API (our own ad account, system-user token).
 * Env: META_SYSTEM_USER_TOKEN, META_AD_ACCOUNT_ID (digits, no "act_"), META_PAGE_ID, optional META_PIXEL_ID,
 * optional META_INSTAGRAM_ACTOR_ID, META_API_VERSION.
 * EVERYTHING is created PAUSED. Only setStatus(..., "ACTIVE") spends money, and it is only called from the
 * launch_activate job, which only exists after a human taps "Go live".
 */
export function metaConfigured(): boolean {
  return !!(envOpt("META_SYSTEM_USER_TOKEN") && envOpt("META_AD_ACCOUNT_ID") && envOpt("META_PAGE_ID"));
}

const base = () => `https://graph.facebook.com/${envOpt("META_API_VERSION") ?? "v24.0"}`;
const act = () => `act_${env("META_AD_ACCOUNT_ID").replace(/^act_/, "")}`;

// deno-lint-ignore no-explicit-any
async function call<T = any>(method: "GET" | "POST", path: string, params: Record<string, unknown> = {}): Promise<T> {
  const body = new URLSearchParams();
  body.set("access_token", env("META_SYSTEM_USER_TOKEN"));
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    body.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  const url = `${base()}/${path}`;
  const res = method === "GET" ? await fetch(`${url}?${body}`) : await fetch(url, { method: "POST", body });
  const json = await res.json();
  if (!res.ok || json.error) {
    const e = json.error ?? {};
    throw new Error(`Meta ${path}: ${e.error_user_msg ?? e.message ?? res.status}`);
  }
  return json as T;
}

export async function uploadImage(base64: string): Promise<string> {
  const res = await call("POST", `${act()}/adimages`, { bytes: base64 });
  const first = Object.values(res.images ?? {})[0] as { hash: string } | undefined;
  if (!first) throw new Error("Meta adimages: no hash returned");
  return first.hash;
}

export async function uploadVideo(fileUrl: string, title: string): Promise<string> {
  const res = await call("POST", `${act()}/advideos`, { file_url: fileUrl, title });
  return res.id as string;
}

export interface CampaignBuild {
  name: string;
  mode: "waitlist" | "preorder";
  dailyBudgetCents: number;
  link: string;
  creatives: { primaryText: string; headline: string; imageHash?: string; videoId?: string; thumbnailUrl?: string }[];
}

export async function buildPausedCampaign(b: CampaignBuild): Promise<{ campaignId: string; adsetId: string; adIds: string[] }> {
  const pixel = envOpt("META_PIXEL_ID");
  const objective = pixel ? (b.mode === "preorder" ? "OUTCOME_SALES" : "OUTCOME_LEADS") : "OUTCOME_TRAFFIC";
  const campaign = await call("POST", `${act()}/campaigns`, {
    name: b.name,
    objective,
    status: "PAUSED",
    special_ad_categories: [],
    is_adset_budget_sharing_enabled: false,
  });
  const adset = await call("POST", `${act()}/adsets`, {
    name: `${b.name} · US broad`,
    campaign_id: campaign.id,
    daily_budget: b.dailyBudgetCents,
    billing_event: "IMPRESSIONS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    optimization_goal: pixel ? "OFFSITE_CONVERSIONS" : "LANDING_PAGE_VIEWS",
    promoted_object: pixel ? { pixel_id: pixel, custom_event_type: b.mode === "preorder" ? "PURCHASE" : "LEAD" } : undefined,
    destination_type: "WEBSITE",
    targeting: { geo_locations: { countries: ["US"] }, age_min: 18, targeting_automation: { advantage_audience: 1 } },
    status: "PAUSED",
  });
  const adIds: string[] = [];
  const cta = { type: b.mode === "preorder" ? "SHOP_NOW" : "SIGN_UP", value: { link: b.link } };
  const ig = envOpt("META_INSTAGRAM_ACTOR_ID");
  for (const [i, c] of b.creatives.entries()) {
    const object_story_spec = c.videoId
      ? { page_id: env("META_PAGE_ID"), instagram_actor_id: ig, video_data: { video_id: c.videoId, image_url: c.thumbnailUrl, message: c.primaryText, title: c.headline, call_to_action: cta } }
      : { page_id: env("META_PAGE_ID"), instagram_actor_id: ig, link_data: { link: b.link, message: c.primaryText, name: c.headline, image_hash: c.imageHash, call_to_action: cta } };
    const creative = await call("POST", `${act()}/adcreatives`, { name: `${b.name} · creative ${i + 1}`, object_story_spec });
    const ad = await call("POST", `${act()}/ads`, { name: `${b.name} · ad ${i + 1}`, adset_id: adset.id, creative: { creative_id: creative.id }, status: "PAUSED" });
    adIds.push(ad.id);
  }
  return { campaignId: campaign.id, adsetId: adset.id, adIds };
}

export async function setStatus(ids: string[], status: "ACTIVE" | "PAUSED"): Promise<void> {
  for (const id of ids) await call("POST", id, { status });
}

export interface DailyInsight {
  date: string;
  spend_cents: number;
  impressions: number;
  clicks: number;
  lp_views: number;
}

export async function campaignInsights(campaignId: string, since: string, until: string): Promise<DailyInsight[]> {
  const res = await call("GET", `${campaignId}/insights`, {
    fields: "spend,impressions,inline_link_clicks,actions,date_start",
    time_range: { since, until },
    time_increment: 1,
  });
  // deno-lint-ignore no-explicit-any
  return (res.data ?? []).map((d: any) => ({
    date: d.date_start,
    spend_cents: Math.round(Number(d.spend ?? 0) * 100),
    impressions: Number(d.impressions ?? 0),
    clicks: Number(d.inline_link_clicks ?? 0),
    lp_views: Number((d.actions ?? []).find((a: { action_type: string }) => a.action_type === "landing_page_view")?.value ?? 0),
  }));
}
