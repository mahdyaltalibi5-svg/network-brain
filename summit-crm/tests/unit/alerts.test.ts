import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushes: { title: string; body: string; url: string }[] = [];
vi.mock("web-push", () => ({ sendNotification: async (_s: unknown, body: string) => void pushes.push(JSON.parse(body)) }));

import { migrate, pgliteDb, setDb, type Db } from "@/lib/db";
import { leadAlert, upsertLead } from "@/lib/leads";
import { saveSubscription } from "@/lib/push";
import { POST as testAlert } from "@/app/api/push/test/route";

let db: Db;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
beforeEach(async () => {
  db = await pgliteDb();
  await migrate(db);
  setDb(db);
  pushes.length = 0;
  vi.stubEnv("VAPID_PUBLIC_KEY", "pub");
  vi.stubEnv("VAPID_PRIVATE_KEY", "priv");
  vi.stubEnv("META_CAPI_TOKEN", "");
  await saveSubscription({ endpoint: "https://push.example/kobe", keys: { p256dh: "k", auth: "a" } }, "Phone");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  setDb(undefined);
  await db.close();
});

describe("lead alerts", () => {
  it("alerts for every ad lead new to the CRM, even one found late, and stays quiet for imports", async () => {
    // found by the background check 3 hours after it was submitted
    await upsertLead({ source: "meta", metaLeadId: "501", fullName: "Avery Stone", phone: "+18015550111", occasion: "Wedding", platform: "ig", adName: "Navy suit reel", createdAt: hoursAgo(3) }, { alert: "always" });
    expect(pushes).toHaveLength(1);
    expect(pushes[0].title).toBe("New lead from your Instagram ad");
    expect(pushes[0].body).toBe("Avery Stone · Wedding · +18015550111\nAd: Navy suit reel\nTap to call now.");
    expect(pushes[0].url).toMatch(/^\/portal\/leads\//);

    // the same lead again (webhook + poll both deliver it): no second alert
    await upsertLead({ source: "meta", metaLeadId: "501", fullName: "Avery Stone", createdAt: hoursAgo(3) }, { alert: "always" });
    // a backfill or file import of old leads: no alerts
    await upsertLead({ source: "meta", metaLeadId: "502", fullName: "Old Lead", createdAt: hoursAgo(48) }, { alert: "never" });
    // default (website form): alerts only when fresh
    await upsertLead({ source: "website", fullName: "Fresh Site" });
    await upsertLead({ source: "website", fullName: "Stale Site", createdAt: hoursAgo(5) });
    expect(pushes.map((p) => p.title)).toEqual(["New lead from your Instagram ad", "New lead"]);
  });

  it("names Facebook ads and messages, and the test alert reaches every device", async () => {
    const fb = (await upsertLead({ source: "meta", metaLeadId: "601", fullName: "Sam", platform: "fb", campaignName: "Kobe.Ascend - LEADS" }, { alert: "never" })).lead;
    expect(leadAlert(fb)).toEqual({ title: "New lead from your Facebook ad", body: "Sam\nAd: Kobe.Ascend - LEADS\nTap to call now." });
    const dm = (await upsertLead({ source: "meta", metaLeadId: "dm:ig:9", fullName: "Jo", platform: "instagram_dm", notes: "Do you do tuxedos?" }, { alert: "never" })).lead;
    expect(leadAlert(dm)).toEqual({ title: "New Instagram message", body: "Jo: Do you do tuxedos?" });

    const res = await testAlert();
    expect(await res.json()).toEqual({ sent: 1, failed: 0 });
    expect(pushes.at(-1)!.body).toContain("Test alert");
  });
});
