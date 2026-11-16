import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushes: { endpoint: string; body: unknown }[] = [];
let failEndpoint: string | null = null;
vi.mock("web-push", () => ({
  sendNotification: async (sub: { endpoint: string }, body: string) => {
    if (sub.endpoint === failEndpoint) throw Object.assign(new Error("gone"), { statusCode: 410 });
    pushes.push({ endpoint: sub.endpoint, body: JSON.parse(body) });
  },
}));

import { migrate, pgliteDb, setDb, type Db } from "@/lib/db";
import { activities, getLead, moveLead, upsertLead } from "@/lib/leads";
import { notifyAll, saveSubscription, subscriptionCount } from "@/lib/push";
import { describeChange, publish, validateSettings, type SiteSettings } from "@/lib/site";
import { sendNudges, speedStats, textTemplate, touchLead, waitingLeads } from "@/lib/speed";
import { GET as nudgeRoute } from "@/app/api/speed/nudge/route";
import { POST as touchRoute } from "@/app/api/leads/[id]/touch/route";

let db: Db;
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

beforeEach(async () => {
  db = await pgliteDb();
  await migrate(db);
  setDb(db);
  pushes.length = 0;
  failEndpoint = null;
  vi.stubEnv("VAPID_PUBLIC_KEY", "pub");
  vi.stubEnv("VAPID_PRIVATE_KEY", "priv");
  vi.stubEnv("CRON_SECRET", "cron-secret");
  vi.stubEnv("META_CAPI_TOKEN", "");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  setDb(undefined);
  await db.close();
});

const phone = () => saveSubscription({ endpoint: "https://push.example/phone", keys: { p256dh: "p", auth: "a" } }, "Phone");

describe("lead alerts", () => {
  it("alerts every device the moment a fresh lead arrives, but not for old imported ones", async () => {
    await phone();
    const { lead } = await upsertLead({ source: "website", fullName: "Alex Park", occasion: "Wedding" });
    expect(pushes).toHaveLength(1);
    expect(pushes[0].body).toMatchObject({ title: "New lead · Wedding", url: `/portal/leads/${lead.id}` });
    await upsertLead({ source: "meta", metaLeadId: "1203", fullName: "Old Lead", createdAt: minutesAgo(60 * 24 * 3) });
    expect(pushes).toHaveLength(1);
  });

  it("drops subscriptions the push service says are gone", async () => {
    await phone();
    failEndpoint = "https://push.example/phone";
    expect(await notifyAll({ title: "t", body: "b" })).toEqual({ sent: 0, failed: 1 });
    expect(await subscriptionCount()).toBe(0);
  });
});

describe("speed to lead", () => {
  it("stops the clock at the first call, text or email, and logs each one", async () => {
    const { lead } = await upsertLead({ source: "meta", metaLeadId: "1204", fullName: "Jordan Reyes", phone: "801-555-0100", createdAt: minutesAgo(4) });
    expect((await waitingLeads()).map((l) => l.id)).toEqual([lead.id]);
    const mins = await touchLead(lead.id, "call");
    expect(mins).toBeGreaterThan(3.9);
    expect(mins).toBeLessThan(4.2);
    expect(await touchLead(lead.id, "text")).toBeNull(); // only the first counts
    expect(await waitingLeads()).toEqual([]);
    const log = await activities(lead.id);
    expect(log.filter((a) => a.kind === "call")[0].body).toMatch(/^Called 801-555-0100 · first response in 4 min$/);
    expect(log.some((a) => a.kind === "text")).toBe(true);
  });

  it("moving a lead out of New also counts as the first response", async () => {
    const { lead } = await upsertLead({ source: "manual", fullName: "Walk In" });
    await moveLead(lead.id, "booked");
    expect((await getLead(lead.id))!.firstContactAt).not.toBeNull();
  });

  it("reports median and the share answered inside 5 and 15 minutes, ignoring late imports", async () => {
    for (const [i, m] of [2, 4, 10, 30].entries()) {
      const { lead } = await upsertLead({ source: "meta", metaLeadId: `13${i}`, fullName: `L${i}`, createdAt: minutesAgo(m + 1) });
      await db.query(`UPDATE leads SET created_at = lead_created_at, first_contact_at = lead_created_at + ($2 || ' minutes')::interval WHERE id = $1`, [lead.id, String(m)]);
    }
    // a backfilled lead from last week, answered days later, must not drag the average
    const { lead: old } = await upsertLead({ source: "meta", metaLeadId: "1399", fullName: "Backfill", createdAt: minutesAgo(60 * 24 * 7) });
    await touchLead(old.id, "call");
    await upsertLead({ source: "website", fullName: "Waiting" });
    const s = await speedStats(30);
    expect(s).toMatchObject({ responded: 4, medianMin: 7, within5: 50, within15: 75, waiting: 1 });
  });

  it("sends one reminder per threshold while a lead waits, then stops", async () => {
    await phone();
    const { lead } = await upsertLead({ source: "website", fullName: "Sam Lee", occasion: "Tuxedo" });
    pushes.length = 0;
    await db.query(`UPDATE leads SET lead_created_at = now() - interval '6 minutes', created_at = now() - interval '6 minutes' WHERE id = $1`, [lead.id]);
    expect(await sendNudges()).toMatchObject({ sent: 1 });
    expect(await sendNudges()).toMatchObject({ sent: 0 }); // already reminded at 5 min
    await db.query(`UPDATE leads SET lead_created_at = now() - interval '20 minutes', created_at = now() - interval '20 minutes' WHERE id = $1`, [lead.id]);
    expect(await sendNudges()).toMatchObject({ sent: 1 });
    expect(pushes[1].body).toMatchObject({ title: expect.stringMatching(/^Still waiting · 20 min$/), url: `/portal/leads/${lead.id}` });
    await touchLead(lead.id, "call");
    await db.query(`UPDATE leads SET lead_created_at = now() - interval '90 minutes', created_at = now() - interval '90 minutes' WHERE id = $1`, [lead.id]);
    expect(await sendNudges()).toMatchObject({ sent: 0 }); // answered: no more reminders
  });

  it("the reminder endpoint needs the cron secret", async () => {
    expect((await nudgeRoute(new Request("http://crm.test/api/speed/nudge"))).status).toBe(401);
    const ok = await nudgeRoute(new Request("http://crm.test/api/speed/nudge", { headers: { authorization: "Bearer cron-secret" } }));
    expect(ok.status).toBe(200);
    expect((await nudgeRoute(new Request("http://crm.test/api/speed/nudge?key=cron-secret"))).status).toBe(200);
    expect((await nudgeRoute(new Request("http://crm.test/api/speed/nudge?key=wrong"))).status).toBe(401);
  });

  it("logs taps sent by sendBeacon (text/plain JSON)", async () => {
    const { lead } = await upsertLead({ source: "manual", fullName: "Beacon Test" });
    const res = await touchRoute(new Request("http://crm.test", { method: "POST", body: JSON.stringify({ channel: "text" }) }), { params: Promise.resolve({ id: lead.id }) });
    expect(res.status).toBe(200);
    expect((await getLead(lead.id))!.firstContactAt).not.toBeNull();
    const bad = await touchRoute(new Request("http://crm.test", { method: "POST", body: JSON.stringify({ channel: "fax" }) }), { params: Promise.resolve({ id: lead.id }) });
    expect(bad.status).toBe(400);
  });

  it("drafts a personal first text", () => {
    expect(textTemplate({ fullName: "Jordan Reyes", occasion: "Wedding" })).toBe(
      "Hi Jordan, it's Kobe from Summit Customs. Thanks for reaching out about wedding. When's a good time for a quick call?",
    );
    expect(textTemplate({ fullName: null, occasion: null })).toMatch(/^Hi, it's Kobe/);
  });
});

describe("website editing", () => {
  const current: SiteSettings = {
    announcement: { enabled: false, text: "", link: "", linkText: "" },
    phone: "(801) 866-9718",
    email: "kobe@summitcustomsuits.com",
    hours: { days: "Monday to Saturday", daysShort: "Mon–Sat", open: "10am", close: "6pm" },
  };

  it("validates input before anything is published", () => {
    const bad = validateSettings({ ...current, phone: "555", email: "nope", hours: { ...current.hours, open: "ten" }, announcement: { enabled: true, text: "", link: "javascript:alert(1)", linkText: "" } });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors).toHaveLength(5);
    const ok = validateSettings({ ...current, email: "  Kobe@SummitCustomSuits.com ", hours: { ...current.hours, open: "9:30AM" } });
    expect(ok.ok && ok.settings.email).toBe("kobe@summitcustomsuits.com");
  });

  it("describes changes in plain words", () => {
    expect(describeChange(current, { ...current, phone: "(385) 555-0142", announcement: { enabled: true, text: "Holiday fittings open", link: "/book", linkText: "Book" } })).toBe(
      "announcement on: “Holiday fittings open”; phone (385) 555-0142",
    );
    expect(describeChange(current, current)).toBe("");
  });

  it("commits site.json to GitHub, deploys that commit on Vercel, then reports it live", async () => {
    vi.stubEnv("GITHUB_TOKEN", "gh");
    vi.stubEnv("VERCEL_TOKEN", "vc");
    const calls: { method: string; url: string; body?: unknown }[] = [];
    let state = "BUILDING";
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      calls.push({ method, url, body: init.body ? JSON.parse(String(init.body)) : undefined });
      if (url.includes("api.github.com") && method === "GET") return Response.json({ sha: "blob1", content: Buffer.from(JSON.stringify(current)).toString("base64") });
      if (url.includes("api.github.com") && method === "PUT") return Response.json({ commit: { sha: "c0ffee" } });
      if (url.includes("/v13/deployments") && method === "POST") return Response.json({ id: "dpl_1" });
      if (url.includes("/v13/deployments/dpl_1")) return Response.json({ readyState: state });
      return Response.json({}, { status: 404 });
    });
    const r = await publish({ ...current, hours: { ...current.hours, close: "7pm" } });
    expect(r.ok).toBe(true);
    const put = calls.find((c) => c.method === "PUT")!;
    expect(put.url).toContain("/repos/mahdyaltalibi5-svg/network-brain/contents/summit-suit-src/site.json");
    expect(put.body).toMatchObject({ sha: "blob1", branch: "claude/relaxed-lovelace-jrt1qj", message: "Website (via Summit CRM): hours Monday to Saturday, 10am–7pm" });
    expect(JSON.parse(Buffer.from((put.body as { content: string }).content, "base64").toString()).hours.close).toBe("7pm");
    const dep = calls.find((c) => c.method === "POST")!;
    expect(dep.url).toContain("teamId=team_bsKASb2CekUFHzj7lwoHm0pC");
    expect(dep.body).toMatchObject({ project: "summit-customs-suits", target: "production", gitSource: { type: "github", sha: "c0ffee" } });

    const { refreshChange } = await import("@/lib/site");
    const id = r.ok ? r.change.id : "";
    expect((await refreshChange(id))!.status).toBe("publishing");
    state = "READY";
    expect((await refreshChange(id))!.status).toBe("live");
  });

  it("refuses to publish without tokens, or when nothing changed", async () => {
    expect(await publish(current)).toEqual({ ok: false, errors: [expect.stringMatching(/isn't connected/)] });
    vi.stubEnv("GITHUB_TOKEN", "gh");
    vi.stubEnv("VERCEL_TOKEN", "vc");
    vi.stubGlobal("fetch", async () => Response.json({ sha: "b", content: Buffer.from(JSON.stringify(current)).toString("base64") }));
    expect(await publish(current)).toEqual({ ok: false, errors: ["Nothing has changed."] });
  });
});
