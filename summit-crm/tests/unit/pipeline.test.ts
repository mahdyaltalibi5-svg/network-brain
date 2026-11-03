import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { migrate, pgliteDb, setDb, type Db } from "@/lib/db";
import { activities, funnelByCampaign, getLead, moveLead, upsertLead } from "@/lib/leads";
import { GET as verify, POST as webhook } from "@/app/api/meta/webhook/route";
import { POST as websiteLead } from "@/app/api/leads/route";

/**
 * End-to-end through the real code paths, on an in-memory Postgres (PGlite), with Meta's
 * Graph API replaced by a fake `fetch` that records what would have been sent.
 */
let db: Db;
let sent: { url: URL; body: string | null }[];

const META_LEAD = {
  id: "120211111111111111",
  created_time: "2026-11-01T15:04:05+0000",
  field_data: [
    { name: "full_name", values: ["Jordan Reyes"] },
    { name: "email", values: ["jordan@example.com"] },
    { name: "phone_number", values: ["8015550199"] },
  ],
  campaign_id: "c1",
  campaign_name: "Grooms – SLC",
  ad_id: "ad1",
  form_id: "f1",
  platform: "fb",
};

beforeEach(async () => {
  db = await pgliteDb();
  await migrate(db);
  setDb(db);
  sent = [];
  vi.stubEnv("META_APP_SECRET", "app-secret");
  vi.stubEnv("META_VERIFY_TOKEN", "verify-me");
  vi.stubEnv("META_PAGE_ACCESS_TOKEN", "page-token");
  vi.stubEnv("META_PIXEL_ID", "999");
  vi.stubEnv("META_CAPI_TOKEN", "capi-token");
  vi.stubGlobal("fetch", async (input: URL | string, init?: RequestInit) => {
    const url = new URL(String(input));
    sent.push({ url, body: (init?.body as string) ?? null });
    if (url.pathname.endsWith(`/${META_LEAD.id}`)) return Response.json(META_LEAD);
    if (url.pathname.endsWith("/999/events")) return Response.json({ events_received: 1, fbtrace_id: "x" });
    return Response.json({ error: { message: "unexpected call" } }, { status: 400 });
  });
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  setDb(undefined);
  await db.close();
});

const signed = (body: string) =>
  new Request("http://crm.test/api/meta/webhook", {
    method: "POST",
    body,
    headers: { "x-hub-signature-256": "sha256=" + createHmac("sha256", "app-secret").update(body).digest("hex") },
  });

const delivery = JSON.stringify({
  object: "page",
  entry: [{ id: "page1", time: 1, changes: [{ field: "leadgen", value: { leadgen_id: META_LEAD.id, page_id: "page1", form_id: "f1" } }] }],
});

const capiBodies = () => sent.filter((s) => s.url.pathname.endsWith("/events")).map((s) => s.body!);

describe("Meta webhook", () => {
  it("answers the verification handshake only with the right token", async () => {
    const ok = await verify(new Request("http://crm.test/api/meta/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42"));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("42");
    const bad = await verify(new Request("http://crm.test/api/meta/webhook?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42"));
    expect(bad.status).toBe(403);
  });

  it("rejects unsigned deliveries", async () => {
    const res = await webhook(new Request("http://crm.test/api/meta/webhook", { method: "POST", body: delivery }));
    expect(res.status).toBe(401);
  });

  it("imports the lead once, then reports it to Meta as a Lead", async () => {
    const res = await webhook(signed(delivery));
    expect(res.status).toBe(200);
    const again = await webhook(signed(delivery)); // Meta redelivers
    const [first] = (await res.json()).results;
    expect((await again.json()).results[0]).toMatchObject({ id: first.id, created: false });

    const lead = await getLead(first.id);
    expect(lead).toMatchObject({ fullName: "Jordan Reyes", stage: "new", campaignName: "Grooms – SLC", source: "meta" });
    expect(sent[0].url.searchParams.get("access_token")).toBe("page-token");

    const bodies = capiBodies();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('"lead_id":120211111111111111');
    expect(bodies[0]).toContain('"event_name":"Lead"');
    expect(bodies[0]).toContain('"event_source":"crm"');
  });
});

describe("pipeline", () => {
  it("moves through stages, stamps funnel dates, and reports each stage and the order value", async () => {
    const { lead } = await upsertLead({ source: "meta", metaLeadId: "120211111111111112", fullName: "Sam Lee", email: "sam@example.com", campaignId: "c1", campaignName: "Grooms" });
    await moveLead(lead.id, "booked");
    await moveLead(lead.id, "ordered", { valueCents: 285000 });
    await moveLead(lead.id, "lost");

    const after = (await getLead(lead.id))!;
    expect(after.stage).toBe("lost");
    expect(after.bookedAt).not.toBeNull();
    expect(after.orderedAt).not.toBeNull();

    const names = capiBodies().map((b) => JSON.parse(b.replace(/"lead_id":(\d+)/, '"lead_id":"$1"')).data[0].event_name);
    expect(names).toEqual(["Lead", "Consultation Booked", "Purchase", "Disqualified"]);
    expect(capiBodies()[2]).toContain('"value":2850');

    const log = await activities(lead.id);
    expect(log.map((a) => a.kind)).toEqual(expect.arrayContaining(["created", "stage", "value", "capi"]));

    // A later "lost" doesn't erase the booking and order from campaign reporting.
    const funnel = await funnelByCampaign(new Date(Date.now() - 86_400_000), new Date(Date.now() + 86_400_000));
    expect(funnel.get("c1")).toMatchObject({ leads: 1, booked: 1, ordered: 1, revenueCents: 285000 });
  });

  it("logs, rather than fails, when the Conversions API isn't configured", async () => {
    vi.stubEnv("META_CAPI_TOKEN", "");
    const { lead } = await upsertLead({ source: "manual", fullName: "Walk-in" });
    const log = await activities(lead.id);
    expect(log.find((a) => a.kind === "capi")?.body).toMatch(/not sent to Meta: Conversions API not configured/);
    expect(capiBodies()).toHaveLength(0);
  });
});

describe("website intake", () => {
  const post = (body: unknown, origin = "https://summitcustomsuits.com") =>
    websiteLead(new Request("http://crm.test/api/leads", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", origin } }));

  it("creates a website lead with CORS for the studio's site", async () => {
    const res = await post({ name: "Alex Park", email: "alex@example.com", occasion: "Bespoke Suit", notes: "Saturday 11am" });
    expect(res.status).toBe(201);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://summitcustomsuits.com");
    const lead = (await getLead((await res.json()).id))!;
    expect(lead).toMatchObject({ source: "website", fullName: "Alex Park", occasion: "Bespoke Suit", stage: "new" });
  });

  it("accepts the booking page's multipart form posts (no CORS preflight needed)", async () => {
    const fd = new FormData();
    fd.append("name", "Riley Shaw");
    fd.append("phone", "801-555-0177");
    fd.append("occasion", "Bespoke Suit");
    fd.append("fbc", "fb.1.1730000000000.AbCdEf");
    const res = await websiteLead(new Request("http://crm.test/api/leads", { method: "POST", body: fd, headers: { origin: "https://www.summitcustomsuits.com" } }));
    expect(res.status).toBe(201);
    const lead = (await getLead((await res.json()).id))!;
    expect(lead).toMatchObject({ fullName: "Riley Shaw", phone: "801-555-0177", fbc: "fb.1.1730000000000.AbCdEf" });
  });

  it("blocks other origins, bots and incomplete submissions", async () => {
    expect((await post({ name: "X", email: "x@example.com" }, "https://evil.example")).status).toBe(403);
    expect((await post({ name: "Bot", email: "b@example.com", company: "spam" })).status).toBe(200);
    expect((await post({ name: "No contact" })).status).toBe(422);
    expect((await db.query("SELECT count(*)::int AS n FROM leads"))[0].n).toBe(0);
  });
});
