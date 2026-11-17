import { readSettings } from "../vault";

/**
 * Everything the CRM needs to talk to Meta. "Connect with Facebook" on the Settings page
 * saves it in the database; environment variables still work and fill any gap (and the
 * dedicated META_CAPI_TOKEN / META_ADS_ACCESS_TOKEN win when set).
 */
export type MetaCreds = {
  appId?: string;
  appSecret?: string;
  appName?: string;
  verifyToken?: string;
  pageId?: string;
  pageName?: string;
  pageToken?: string;
  userName?: string;
  userToken?: string;
  userTokenExpiresAt?: Date;
  adAccountId?: string;
  adAccountName?: string;
  pixelId?: string;
  capiToken?: string;
  adsToken?: string;
  testEventCode?: string;
  connectedAt?: Date;
  lastPollAt?: Date;
  igUsername?: string;
  adsSyncedAt?: Date;
  adsError?: string;
  log: ConnectStep[];
};

export type ConnectStep = { step: string; ok: boolean; detail: string };

/** Keys in app_settings that hold secrets (encrypted at rest). */
export const SECRET_KEYS = ["meta.app_secret", "meta.verify_token", "meta.page_token", "meta.user_token"];

const env = (k: string) => process.env[k]?.trim() || undefined;
const date = (s?: string) => (s && !Number.isNaN(Date.parse(s)) ? new Date(s) : undefined);
const act = (id?: string) => (id ? (id.startsWith("act_") ? id : `act_${id}`) : undefined);

export async function metaCreds(): Promise<MetaCreds> {
  const s = await readSettings("meta.");
  const userToken = s["meta.user_token"];
  const pageToken = s["meta.page_token"] ?? env("META_PAGE_ACCESS_TOKEN");
  let log: ConnectStep[] = [];
  try {
    log = JSON.parse(s["meta.connect_log"] ?? "[]");
  } catch {}
  return {
    appId: s["meta.app_id"] ?? env("META_APP_ID"),
    appSecret: s["meta.app_secret"] ?? env("META_APP_SECRET"),
    appName: s["meta.app_name"],
    verifyToken: s["meta.verify_token"] ?? env("META_VERIFY_TOKEN"),
    pageId: s["meta.page_id"] ?? env("META_PAGE_ID"),
    pageName: s["meta.page_name"],
    pageToken,
    userName: s["meta.user_name"],
    userToken,
    userTokenExpiresAt: date(s["meta.user_token_expires"]),
    adAccountId: act(s["meta.ad_account_id"] ?? env("META_AD_ACCOUNT_ID")),
    adAccountName: s["meta.ad_account_name"],
    pixelId: s["meta.pixel_id"] ?? env("META_PIXEL_ID"),
    capiToken: env("META_CAPI_TOKEN") ?? userToken,
    adsToken: env("META_ADS_ACCESS_TOKEN") ?? userToken ?? pageToken,
    testEventCode: env("META_TEST_EVENT_CODE"),
    connectedAt: date(s["meta.connected_at"]),
    lastPollAt: date(s["meta.last_poll"]),
    igUsername: s["meta.ig_username"],
    adsSyncedAt: date(s["meta.ads_synced_at"]),
    adsError: s["meta.ads_error"],
    log,
  };
}
