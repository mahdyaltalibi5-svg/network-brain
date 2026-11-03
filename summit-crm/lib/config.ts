/**
 * Every setting comes from environment variables (see .env.example). Nothing secret is
 * hard-coded. Each Meta feature switches on by itself once its variables are present.
 */
const env = (key: string) => process.env[key]?.trim() || undefined;

export const config = {
  /** Postgres connection string (Neon, Supabase, Vercel Postgres…). Unset: local PGlite in .data/. */
  databaseUrl: () => env("DATABASE_URL"),
  /** Sign-in password for the CRM. */
  password: () => env("CRM_PASSWORD"),
  /** Secret for signing session cookies (32+ random characters). */
  sessionSecret: () => env("CRM_SESSION_SECRET"),
  /** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` to /api/meta/sync. */
  cronSecret: () => env("CRON_SECRET"),
  /** Origins allowed to post website leads to /api/leads, comma-separated. */
  allowedOrigins: () =>
    (env("CRM_ALLOWED_ORIGINS") ?? "https://summitcustomsuits.com,https://www.summitcustomsuits.com,https://summit-customs.vercel.app")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  /** Name sent to Meta as `lead_event_source`. */
  crmName: () => env("CRM_NAME") ?? "Summit CRM",
  currency: () => env("CRM_CURRENCY") ?? "USD",

  meta: {
    graphVersion: () => env("META_GRAPH_VERSION") ?? "v26.0",
    /** App secret: verifies webhook signatures (X-Hub-Signature-256). */
    appSecret: () => env("META_APP_SECRET"),
    /** Any string you choose; entered again in the app's Webhooks settings. */
    verifyToken: () => env("META_VERIFY_TOKEN"),
    /** Facebook Page ID that owns the Instant Forms. */
    pageId: () => env("META_PAGE_ID"),
    /** Long-lived Page access token with leads_retrieval + pages_manage_ads. */
    pageToken: () => env("META_PAGE_ACCESS_TOKEN"),
    /** Dataset / Pixel ID that receives CRM stage events (Conversions API). */
    pixelId: () => env("META_PIXEL_ID"),
    /** Conversions API access token generated for that dataset. */
    capiToken: () => env("META_CAPI_TOKEN"),
    /** Optional: test event code from Events Manager, so events show under "Test events". */
    testEventCode: () => env("META_TEST_EVENT_CODE"),
    /** Ad account ID, digits only or with act_ prefix. */
    adAccountId: () => {
      const id = env("META_AD_ACCOUNT_ID");
      return id ? (id.startsWith("act_") ? id : `act_${id}`) : undefined;
    },
    /** Token with ads_read for the ad account (a system user token is best). */
    adsToken: () => env("META_ADS_ACCESS_TOKEN") ?? env("META_PAGE_ACCESS_TOKEN"),
  },
};

export type Integration = { name: string; ready: boolean; missing: string[]; what: string };

/** What is connected, and what each part still needs. Shown on /settings. */
export function integrations(): Integration[] {
  const check = (name: string, what: string, vars: [string, string | undefined][]): Integration => {
    const missing = vars.filter(([, v]) => !v).map(([k]) => k);
    return { name, what, ready: missing.length === 0, missing };
  };
  const m = config.meta;
  return [
    check("Database", "Stores leads, stages and activity.", [["DATABASE_URL", config.databaseUrl() ?? (process.env.VERCEL ? undefined : "local")]]),
    check("Sign-in", "Password protection for the CRM.", [
      ["CRM_PASSWORD", config.password()],
      ["CRM_SESSION_SECRET", config.sessionSecret()],
    ]),
    check("Lead Ads webhook", "New Instant Form leads arrive in seconds.", [
      ["META_APP_SECRET", m.appSecret()],
      ["META_VERIFY_TOKEN", m.verifyToken()],
      ["META_PAGE_ACCESS_TOKEN", m.pageToken()],
    ]),
    check("Lead sync", "Daily backfill of every form's leads (catches anything a webhook missed).", [
      ["META_PAGE_ID", m.pageId()],
      ["META_PAGE_ACCESS_TOKEN", m.pageToken()],
    ]),
    check("Conversions API", "Sends each stage change back to Meta so ads optimise for real clients.", [
      ["META_PIXEL_ID", m.pixelId()],
      ["META_CAPI_TOKEN", m.capiToken()],
    ]),
    check("Ads reporting", "Spend per campaign, cost per lead, cost per booking and return on ad spend.", [
      ["META_AD_ACCOUNT_ID", m.adAccountId()],
      ["META_ADS_ACCESS_TOKEN", m.adsToken()],
    ]),
  ];
}
