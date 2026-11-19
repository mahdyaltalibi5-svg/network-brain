import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushes: { title: string }[] = [];
vi.mock("web-push", () => ({ sendNotification: async (_s: unknown, body: string) => void pushes.push(JSON.parse(body)) }));

import { migrate, pgliteDb, setDb, type Db } from "@/lib/db";
import { upsertLead } from "@/lib/leads";
import { saveSubscription } from "@/lib/push";
import { touchLead } from "@/lib/speed";
import { kickTicker, needsTicker, runTicker } from "@/lib/ticker";
import { readSettings } from "@/lib/vault";

let db: Db;
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
beforeEach(async () => {
  db = await pgliteDb();
  await migrate(db);
  setDb(db);
  pushes.length = 0;
  vi.stubEnv("VAPID_PUBLIC_KEY", "pub");
  vi.stubEnv("VAPID_PRIVATE_KEY", "priv");
  vi.stubEnv("CRON_SECRET", "cron-secret");
  vi.stubEnv("META_CAPI_TOKEN", "");
  await saveSubscription({ endpoint: "https://web.push.apple.com/kobe", keys: { p256dh: "k", auth: "a" } }, "Phone");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  setDb(undefined);
  await db.close();
});

describe("speed-to-lead ticker (no outside scheduler)", () => {
  it("reminds about a waiting lead, keeps itself going while needed, and stops once they're contacted", async () => {
    const { lead } = await upsertLead({ source: "meta", metaLeadId: "1001", fullName: "Avery Stone", occasion: "2_suits_+_free_custom_sport_coat", createdAt: minutesAgo(6) }, { alert: "never" });
    expect(await needsTicker()).toBe(true);

    const calls: string[] = [];
    const fetcher = (async (url: string | URL) => (calls.push(String(url)), new Response("{}", { status: 202 }))) as typeof fetch;
    // one short run: the 5-minute reminder goes out, and the next run is started
    const r = await runTicker({ runMs: 0, sleep: async () => {}, fetcher });
    expect(r).toMatchObject({ sent: 1, next: true });
    expect(pushes.map((p) => p.title)).toEqual(["Still waiting · 6 min"]);
    expect(calls).toEqual(["https://www.summitcustomsuits.com/portal/api/speed/tick?key=cron-secret"]);
    // it doesn't start twice while one is running
    expect(await kickTicker(fetcher)).toBe(false);

    // Kobe calls: nothing left to watch, the ticker stops
    await touchLead(lead.id, "call");
    expect(await needsTicker()).toBe(false);
    const done = await runTicker({ runMs: 0, sleep: async () => {}, fetcher });
    expect(done).toMatchObject({ next: false });
    expect(Object.values(await readSettings("speed.ticker_until"))).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("ignores old leads (imports, or more than an hour old)", async () => {
    await upsertLead({ source: "meta", metaLeadId: "1002", fullName: "Old", createdAt: minutesAgo(60 * 24 * 5) }, { alert: "never" });
    expect(await needsTicker()).toBe(false);
  });
});
