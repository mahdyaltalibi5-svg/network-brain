import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("web-push", () => ({ sendNotification: async () => {} }));

import { migrate, pgliteDb, setDb, type Db } from "@/lib/db";
import { listLeads } from "@/lib/leads";
import { completeConnect, disconnect, loginUrl, pollLeads, saveApp } from "@/lib/meta/connect";
import { metaCreds } from "@/lib/meta/creds";
import { readSettings } from "@/lib/vault";
import { GET as webhookGet } from "@/app/api/meta/webhook/route";

const APP_ID = "1234567890123";
const SECRET = "0123456789abcdef0123456789abcdef";
let db: Db;
let calls: { method: string; url: URL }[];

/** A tiny fake of the Graph API endpoints the connect flow uses. */
function fakeGraph(overrides: Record<string, unknown> = {}) {
  calls = [];
  vi.stubGlobal("fetch", async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    calls.push({ method, url });
    const path = url.pathname.replace(/^\/v\d+\.\d+\//, "");
    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    if (path in overrides) {
      const o = overrides[path];
      return o instanceof Response ? o : ok(o);
    }
    if (path === APP_ID && method === "GET") return ok({ id: APP_ID, name: "Summit CRM" });
    if (path === "oauth/access_token" && url.searchParams.get("code")) return ok({ access_token: "SHORT" });
    if (path === "oauth/access_token") return ok({ access_token: "LONG-USER", expires_in: 5_184_000 });
    if (path === "me") return ok({ id: "42", name: "Kobe Apponsah" });
    if (path === "me/permissions") return ok({ data: ["pages_show_list", "pages_read_engagement", "pages_manage_metadata", "pages_manage_ads", "leads_retrieval", "ads_read", "ads_management", "business_management"].map((permission) => ({ permission, status: "granted" })) });
    if (path === "me/accounts") return ok({ data: [{ id: "999", name: "Other Page", access_token: "P0" }, { id: "1443897258798067", name: "Summit Custom Suits", access_token: "PAGE-TOKEN" }] });
    if (path === `${APP_ID}/subscriptions` && method === "POST") return ok({ success: true });
    if (path === "1443897258798067/subscribed_apps" && method === "POST") return ok({ success: true });
    if (path === "me/adaccounts") return ok({ data: [{ id: "act_902291632605494", name: "Summit Ads", account_status: 1 }] });
    if (path === "1106836472346765") return ok({ id: "1106836472346765", name: "Summit pixel" });
    if (path === "1443897258798067/leadgen_forms") return ok({ data: [{ id: "F1" }] });
    if (path === "F1/leads")
      return ok({
        data: [
          { id: "77001", created_time: "2026-11-10T15:00:00+0000", campaign_name: "Kobe.Ascend - LEADS", field_data: [{ name: "full_name", values: ["Jamie Cole"] }, { name: "phone_number", values: ["+18015550142"] }] },
        ],
      });
    return new Response(JSON.stringify({ error: { message: `unexpected ${method} ${path}` } }), { status: 400 });
  });
}

beforeEach(async () => {
  db = await pgliteDb();
  await migrate(db);
  setDb(db);
  vi.stubEnv("CRM_SESSION_SECRET", "unit-test-session-secret-unit-test");
  vi.stubEnv("META_PAGE_ID", "1443897258798067");
  vi.stubEnv("META_PIXEL_ID", "1106836472346765");
  vi.stubEnv("META_AD_ACCOUNT_ID", "902291632605494");
  vi.stubEnv("META_CAPI_TOKEN", "");
  vi.stubEnv("META_APP_SECRET", "");
  vi.stubEnv("META_PAGE_ACCESS_TOKEN", "");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  setDb(undefined);
  await db.close();
});

describe("connect with Facebook", () => {
  it("checks the app, then one login sets up page, webhook, ads, pixel and imports leads", async () => {
    fakeGraph();
    await expect(saveApp("abc", SECRET)).rejects.toThrow(/App ID/);
    await saveApp(APP_ID, SECRET);
    const stored = await db.query<{ key: string; value: string }>(`SELECT key, value FROM app_settings WHERE key = 'meta.app_secret'`);
    expect(stored[0].value).not.toContain(SECRET); // encrypted at rest

    const url = new URL(await loginUrl("STATE"));
    expect(url.searchParams.get("redirect_uri")).toBe("https://www.summitcustomsuits.com/portal/api/meta/callback");
    expect(url.searchParams.get("scope")).toContain("leads_retrieval");

    const r = await completeConnect("CODE");
    expect(r.log.map((s) => [s.step, s.ok])).toEqual([
      ["Facebook login", true],
      ["Facebook Page", true],
      ["Instant lead webhook", true],
      ["Ad account", true],
      ["Conversions API", true],
      ["Lead import", true],
    ]);
    expect(r.ok).toBe(true);

    const m = await metaCreds();
    expect(m.pageName).toBe("Summit Custom Suits"); // the configured Page, not the first one
    expect(m.pageToken).toBe("PAGE-TOKEN");
    expect(m.capiToken).toBe("LONG-USER");
    expect(m.adsToken).toBe("LONG-USER");
    expect(m.adAccountId).toBe("act_902291632605494");

    const sub = calls.find((c) => c.url.pathname.endsWith(`${APP_ID}/subscriptions`))!;
    expect(sub.url.searchParams.get("callback_url")).toBe("https://www.summitcustomsuits.com/portal/api/meta/webhook");
    expect(sub.url.searchParams.get("access_token")).toBe(`${APP_ID}|${SECRET}`);

    // Meta's verification handshake uses the generated verify token
    const verify = sub.url.searchParams.get("verify_token")!;
    expect(verify.length).toBeGreaterThan(20);
    const ok = await webhookGet(new Request(`http://x/api/meta/webhook?hub.mode=subscribe&hub.verify_token=${verify}&hub.challenge=abc`));
    expect(await ok.text()).toBe("abc");
    expect((await webhookGet(new Request(`http://x/api/meta/webhook?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=abc`))).status).toBe(403);

    expect((await listLeads()).map((l) => l.fullName)).toEqual(["Jamie Cole"]);
  });

  it("records what failed instead of giving up, and polling is throttled", async () => {
    fakeGraph({ [`${APP_ID}/subscriptions`]: new Response(JSON.stringify({ error: { message: "Callback verification failed" } }), { status: 400 }) });
    await saveApp(APP_ID, SECRET);
    const r = await completeConnect("CODE");
    expect(r.ok).toBe(false);
    expect(r.log.find((s) => s.step === "Instant lead webhook")).toMatchObject({ ok: false, detail: expect.stringContaining("every 5 minutes") });
    expect(r.log.find((s) => s.step === "Lead import")?.ok).toBe(true);

    expect((await pollLeads()).skipped).toBe(true); // polled moments ago
    const again = await pollLeads({ force: true });
    expect(again).toMatchObject({ skipped: false, fetched: 1, created: 0 });

    await disconnect();
    const m = await metaCreds();
    expect(m.pageToken).toBeUndefined();
    expect(m.appId).toBe(APP_ID); // reconnecting stays one click
    expect(Object.keys(await readSettings("meta.user_token"))).toHaveLength(0);
  });
});
