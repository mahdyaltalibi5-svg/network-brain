import { config } from "../config";
import { upsertLead, type AlertMode } from "../leads";
import { notifyAll } from "../push";
import { withBase } from "../base";
import { readSettings, writeSettings } from "../vault";
import { metaCreds, SECRET_KEYS, type ConnectStep } from "./creds";
import { graph, graphAll } from "./graph";
import { fetchRecentLeads, fromMetaLead } from "./leadgen";
import { syncAds } from "./ads-sync";

/**
 * "Connect with Facebook": one Facebook Login gives the CRM everything it needs.
 *   1. a long-lived user token (ads reporting + Conversions API),
 *   2. a Page token that doesn't expire (lead retrieval),
 *   3. the Page subscribed to the app for `leadgen`, and the app's webhook pointed at the CRM,
 *   4. the ad account and pixel,
 * then imports the last 30 days of leads. A 5-minute poll backs up the webhook.
 */
export const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "pages_manage_ads",
  "leads_retrieval",
  "ads_read",
  "ads_management",
  "business_management",
  "pages_messaging",
  "instagram_basic",
  "instagram_manage_messages",
];

export const redirectUri = () => `${config.publicUrl()}/api/meta/callback`;
export const webhookUrl = () => `${config.publicUrl()}/api/meta/webhook`;

const appToken = (id: string, secret: string) => `${id}|${secret}`;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Saves the Meta app's ID and secret after checking them against the Graph API. */
export async function saveApp(appId: string, appSecret: string) {
  appId = appId.trim();
  appSecret = appSecret.trim();
  if (!/^\d{5,25}$/.test(appId)) throw new Error("The App ID is a long number, shown at the top of the app dashboard.");
  if (!/^[0-9a-f]{32}$/i.test(appSecret)) throw new Error("The App secret is 32 letters and numbers (App settings → Basic → App secret → Show).");
  let app: { id: string; name?: string };
  try {
    app = await graph<{ id: string; name?: string }>(appId, { token: appToken(appId, appSecret), params: { fields: "id,name" } });
  } catch (e) {
    throw new Error(`Meta didn't accept that App ID and secret: ${msg(e)}`);
  }
  const existing = await readSettings("meta.verify_token");
  await writeSettings(
    {
      "meta.app_id": app.id,
      "meta.app_secret": appSecret,
      "meta.app_name": app.name ?? null,
      "meta.verify_token": existing["meta.verify_token"] ?? Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url"),
    },
    SECRET_KEYS,
  );
  return app;
}

/** The Facebook Login address Kobe is sent to. */
export async function loginUrl(state: string) {
  const { appId } = await metaCreds();
  if (!appId) throw new Error("Save the Meta app first");
  const u = new URL(`https://www.facebook.com/${config.meta.graphVersion()}/dialog/oauth`);
  u.searchParams.set("client_id", appId);
  u.searchParams.set("redirect_uri", redirectUri());
  u.searchParams.set("state", state);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPES.join(","));
  u.searchParams.set("auth_type", "rerequest"); // ask again for anything declined last time
  return u.toString();
}

type Page = { id: string; name: string; access_token: string };
type AdAccount = { id: string; name?: string; account_status?: number };

/** Runs after Facebook Login: every step is recorded, so Settings can show exactly what worked. */
export async function completeConnect(code: string): Promise<{ ok: boolean; log: ConnectStep[] }> {
  const m = await metaCreds();
  if (!m.appId || !m.appSecret) throw new Error("Save the Meta app first");
  const app = appToken(m.appId, m.appSecret);
  const log: ConnectStep[] = [];
  const save: Record<string, string | null> = {};

  // 1. code → short-lived token → long-lived (≈60 day) user token
  const short = await graph<{ access_token: string }>("oauth/access_token", {
    token: app,
    params: { client_id: m.appId, client_secret: m.appSecret, redirect_uri: redirectUri(), code },
  });
  const long = await graph<{ access_token: string; expires_in?: number }>("oauth/access_token", {
    token: app,
    params: { grant_type: "fb_exchange_token", client_id: m.appId, client_secret: m.appSecret, fb_exchange_token: short.access_token },
  });
  const user = long.access_token;
  const me = await graph<{ id: string; name: string }>("me", { token: user, params: { fields: "id,name" } });
  save["meta.user_token"] = user;
  save["meta.user_name"] = me.name;
  save["meta.user_token_expires"] = new Date(Date.now() + (long.expires_in ?? 60 * 86_400) * 1000).toISOString();
  save["meta.expiry_warned"] = null;
  log.push({ step: "Facebook login", ok: true, detail: `Signed in as ${me.name}` });

  const perms = await graph<{ data: { permission: string; status: string }[] }>("me/permissions", { token: user }).catch(() => ({ data: [] }));
  const declined = SCOPES.filter((s) => !perms.data.some((p) => p.permission === s && p.status === "granted"));
  if (declined.length) log.push({ step: "Permissions", ok: false, detail: `Not granted: ${declined.join(", ")}. Click Reconnect and allow them.` });

  // 2. the Page and its token (a Page token from a long-lived user token doesn't expire)
  let page: Page | undefined;
  try {
    const pages = await graphAll<Page>("me/accounts", { token: user, params: { fields: "id,name,access_token", limit: "100" } });
    page = pages.find((p) => p.id === m.pageId) ?? pages[0];
    if (!page) throw new Error("This Facebook account doesn't manage any Pages. Sign in with the account that runs Summit Custom Suits.");
    save["meta.page_id"] = page.id;
    save["meta.page_name"] = page.name;
    save["meta.page_token"] = page.access_token;
    log.push({ step: "Facebook Page", ok: true, detail: page.name + (pages.length > 1 && !pages.some((p) => p.id === m.pageId) ? ` (first of ${pages.length} Pages)` : "") });
  } catch (e) {
    log.push({ step: "Facebook Page", ok: false, detail: msg(e) });
  }

  // 3. webhook: the app listens for Page `leadgen`, and the Page is subscribed to the app
  if (page) {
    try {
      await writeSettings({ "meta.page_token": page.access_token, "meta.page_id": page.id }, SECRET_KEYS);
      // Meta calls GET /api/meta/webhook with our verify token during this request.
      await graph(`${m.appId}/subscriptions`, {
        token: app,
        method: "POST",
        params: { object: "page", callback_url: webhookUrl(), fields: "leadgen,messages,message_echoes", verify_token: m.verifyToken ?? "", include_values: "true" },
      });
      await graph(`${page.id}/subscribed_apps`, { token: page.access_token, method: "POST", params: { subscribed_fields: "leadgen,messages,message_echoes" } });
      log.push({ step: "Instant lead webhook", ok: true, detail: `New ${page.name} form leads and Messenger messages arrive in seconds` });
    } catch (e) {
      log.push({ step: "Instant lead webhook", ok: false, detail: `${msg(e)}. Form leads still arrive by polling.` });
    }
    // Instagram DMs: the Page's linked Instagram account
    try {
      const p = await graph<{ instagram_business_account?: { id: string; username?: string } }>(page.id, {
        token: page.access_token,
        params: { fields: "instagram_business_account{id,username}" },
      });
      const ig = p.instagram_business_account;
      if (!ig) throw new Error("No Instagram account is linked to this Page (link it in Meta Business Suite → Settings → Instagram)");
      await graph(`${m.appId}/subscriptions`, {
        token: app,
        method: "POST",
        params: { object: "instagram", callback_url: webhookUrl(), fields: "messages", verify_token: m.verifyToken ?? "", include_values: "true" },
      });
      save["meta.ig_id"] = ig.id;
      save["meta.ig_username"] = ig.username ?? ig.id;
      log.push({ step: "Instagram messages", ok: true, detail: `DMs to @${ig.username ?? ig.id} become leads` });
    } catch (e) {
      log.push({ step: "Instagram messages", ok: false, detail: msg(e) });
    }
  }

  // 4. ad account (reporting) and pixel (Conversions API)
  try {
    const accounts = await graphAll<AdAccount>("me/adaccounts", { token: user, params: { fields: "id,name,account_status", limit: "100" } });
    const acct = accounts.find((a) => a.id === m.adAccountId) ?? accounts.find((a) => a.account_status === 1) ?? accounts[0];
    if (!acct) throw new Error("No ad accounts on this Facebook account");
    save["meta.ad_account_id"] = acct.id;
    save["meta.ad_account_name"] = acct.name ?? acct.id;
    log.push({ step: "Ad account", ok: true, detail: acct.name ?? acct.id });
    if (!m.pixelId) {
      const pixels = await graphAll<{ id: string; name?: string }>(`${acct.id}/adspixels`, { token: user, params: { fields: "id,name" } });
      if (pixels[0]) save["meta.pixel_id"] = pixels[0].id;
    }
  } catch (e) {
    log.push({ step: "Ad account", ok: false, detail: msg(e) });
  }
  const pixel = save["meta.pixel_id"] ?? m.pixelId;
  try {
    if (!pixel) throw new Error("No pixel found on the ad account");
    await graph(pixel, { token: user, params: { fields: "id,name" } });
    log.push({ step: "Conversions API", ok: true, detail: `Stage changes go to dataset ${pixel}` });
  } catch (e) {
    log.push({ step: "Conversions API", ok: false, detail: msg(e) });
  }

  save["meta.connected_at"] = new Date().toISOString();
  await writeSettings(save, SECRET_KEYS);

  // 5. backfill: ad results for 90 days, and form leads for 30
  try {
    const r = await syncAds({ force: true, days: 90 });
    if (!r.skipped) log.push({ step: "Ad results", ok: true, detail: `${r.campaigns} campaigns, ${r.ads} ads, 90 days of results` });
  } catch (e) {
    log.push({ step: "Ad results", ok: false, detail: msg(e) });
  }
  if (page) {
    try {
      const r = await pollLeads({ days: 30, force: true, alert: "never" }); // backfill: no 30 alerts at once
      log.push({ step: "Lead import", ok: true, detail: `${r.fetched} leads in the last 30 days, ${r.created} new` });
    } catch (e) {
      log.push({ step: "Lead import", ok: false, detail: msg(e) });
    }
  }
  await writeSettings({ "meta.connect_log": JSON.stringify(log) });
  return { ok: log.every((s) => s.ok), log };
}

/** Removes the tokens (keeps the app ID/secret so reconnecting is one click). */
export async function disconnect() {
  const keys = ["page_token", "user_token", "user_token_expires", "user_name", "page_name", "ad_account_name", "connected_at", "connect_log", "last_poll", "expiry_warned", "ads_synced_at", "ads_error", "ig_id", "ig_username"];
  await writeSettings(Object.fromEntries(keys.map((k) => [`meta.${k}`, null])));
}

/**
 * Pulls recent form leads and imports any the webhook missed. Called every 5 minutes by the
 * reminder scheduler (throttled to every 4 minutes) and by "Sync now".
 */
export async function pollLeads({ days, force = false, alert = "always" }: { days?: number; force?: boolean; alert?: AlertMode } = {}) {
  const m = await metaCreds();
  if (!m.pageId || !m.pageToken) return { skipped: true as const, fetched: 0, created: 0 };
  const now = Date.now();
  if (!force && m.lastPollAt && now - m.lastPollAt.getTime() < 4 * 60_000) return { skipped: true as const, fetched: 0, created: 0 };
  // overlap the last poll by 15 minutes; first run looks back 3 days
  const since = days ? now - days * 86_400_000 : (m.lastPollAt?.getTime() ?? now - 3 * 86_400_000) - 15 * 60_000;
  const leads = await fetchRecentLeads(Math.floor(since / 1000));
  let created = 0;
  for (const l of leads) if ((await upsertLead(fromMetaLead(l), { alert })).created) created++;
  await writeSettings({ "meta.last_poll": new Date(now).toISOString() });
  return { skipped: false as const, fetched: leads.length, created };
}

/** One phone alert a week before the Facebook login expires (Page leads keep flowing; ads data and CAPI stop). */
export async function warnIfExpiring() {
  const m = await metaCreds();
  if (!m.userTokenExpiresAt || m.userTokenExpiresAt.getTime() - Date.now() > 7 * 86_400_000) return false;
  const s = await readSettings("meta.expiry_warned");
  if (s["meta.expiry_warned"]) return false;
  await writeSettings({ "meta.expiry_warned": new Date().toISOString() });
  await notifyAll({ title: "Reconnect Facebook", body: "The Meta connection expires this week. Open Settings and tap Reconnect.", url: withBase("/settings#meta"), tag: "meta-expiry" });
  return true;
}
