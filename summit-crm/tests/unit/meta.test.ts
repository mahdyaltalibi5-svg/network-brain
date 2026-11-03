import { createHmac, createHash } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildStageEvent, normalizePhone, serializeEvents } from "@/lib/meta/capi";
import { fromMetaLead, leadgenIds, verifySignature } from "@/lib/meta/leadgen";
import { joinCampaigns, presetRange } from "@/lib/meta/insights";
import { createSession, verifySession } from "@/lib/auth";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

describe("webhook signature", () => {
  const body = JSON.stringify({ object: "page", entry: [] });
  const sig = "sha256=" + createHmac("sha256", "app-secret").update(body).digest("hex");

  it("accepts Meta's HMAC of the raw body", async () => {
    expect(await verifySignature(body, sig, "app-secret")).toBe(true);
  });
  it("rejects a wrong secret, a tampered body, or a missing header", async () => {
    expect(await verifySignature(body, sig, "other-secret")).toBe(false);
    expect(await verifySignature(body + " ", sig, "app-secret")).toBe(false);
    expect(await verifySignature(body, null, "app-secret")).toBe(false);
    expect(await verifySignature(body, "sha1=abc", "app-secret")).toBe(false);
  });
});

describe("leadgen payloads", () => {
  it("extracts leadgen IDs from a Page webhook delivery", () => {
    const payload = {
      object: "page",
      entry: [
        { id: "1", time: 1, changes: [{ field: "leadgen", value: { leadgen_id: 444, page_id: "1", form_id: "9" } }, { field: "feed", value: {} }] },
        { id: "1", time: 2, changes: [{ field: "leadgen", value: { leadgen_id: "555" } }] },
      ],
    };
    expect(leadgenIds(payload).map((c) => c.leadgen_id)).toEqual(["444", "555"]);
    expect(leadgenIds({ object: "user", entry: [] })).toEqual([]);
    expect(leadgenIds(null)).toEqual([]);
  });

  it("maps Instant Form answers to CRM fields and keeps every answer", () => {
    const lead = fromMetaLead({
      id: "120211111111111111",
      created_time: "2026-11-01T15:04:05+0000",
      field_data: [
        { name: "first_name", values: ["Jordan"] },
        { name: "last_name", values: ["Reyes"] },
        { name: "email", values: [" Jordan@Example.com "] },
        { name: "phone_number", values: ["+1 801 555 0199"] },
        { name: "what_are_you_shopping_for?", values: ["Wedding suit"] },
        { name: "wedding_date", values: ["June 2027"] },
      ],
      campaign_id: "c1",
      campaign_name: "Grooms – SLC",
      platform: "ig",
    });
    expect(lead).toMatchObject({
      source: "meta",
      metaLeadId: "120211111111111111",
      fullName: "Jordan Reyes",
      email: "Jordan@Example.com",
      phone: "+1 801 555 0199",
      occasion: "Wedding suit",
      campaignId: "c1",
      platform: "ig",
    });
    expect(lead.answers).toContainEqual({ question: "Wedding date", answer: "June 2027" });
    expect(lead.createdAt?.toISOString()).toBe("2026-11-01T15:04:05.000Z");
  });
});

describe("Conversions API events", () => {
  const created = new Date("2026-11-01T15:00:00Z");
  const base = { id: "crm-1", metaLeadId: "120211111111111111", fullName: "Jordan Reyes", email: " Jordan@Example.com", phone: "(801) 555-0199", leadCreatedAt: created };

  it("follows the CRM spec: system_generated, event_source=crm, hashed identifiers", async () => {
    const e = await buildStageEvent(base, "booked", new Date("2026-11-02T10:00:00Z"));
    expect(e.event_name).toBe("Consultation Booked");
    expect(e.action_source).toBe("system_generated");
    expect(e.custom_data).toMatchObject({ event_source: "crm", lead_event_source: "Summit CRM" });
    expect(e.user_data.em).toEqual([sha("jordan@example.com")]);
    expect(e.user_data.ph).toEqual([sha("18015550199")]);
    expect(e.user_data.fn).toEqual([sha("jordan")]);
    expect(e.user_data.ln).toEqual([sha("reyes")]);
    expect(e.event_id).toBe("crm-1:booked");
    expect(e.event_time).toBe(Date.parse("2026-11-02T10:00:00Z") / 1000);
  });

  it("never times an event before the lead existed", async () => {
    const e = await buildStageEvent(base, "new", new Date("2026-10-01T00:00:00Z"));
    expect(e.event_time).toBeGreaterThan(created.getTime() / 1000);
  });

  it("adds value and currency for orders", async () => {
    const e = await buildStageEvent({ ...base, valueCents: 285000 }, "ordered");
    expect(e.event_name).toBe("Purchase");
    expect(e.custom_data).toMatchObject({ value: 2850, currency: "USD" });
  });

  it("sends lead_id as an exact JSON number, even above 2^53", async () => {
    const e = await buildStageEvent(base, "new");
    const body = serializeEvents([e], [base.metaLeadId], "TEST123");
    expect(body).toContain('"lead_id":120211111111111111');
    expect(body).toContain('"test_event_code":"TEST123"');
  });

  it("normalises US phone numbers to include the country code", () => {
    expect(normalizePhone("801-555-0199")).toBe("18015550199");
    expect(normalizePhone("+44 20 7946 0958")).toBe("442079460958");
  });
});

describe("sessions", () => {
  it("round-trips, and rejects tampering, other secrets and expiry", async () => {
    const t = await createSession("s3cret", 1_000);
    expect(await verifySession(t, "s3cret", 2_000)).toBe(true);
    expect(await verifySession(t, "other", 2_000)).toBe(false);
    expect(await verifySession(t.replace(/.$/, (c) => (c === "a" ? "b" : "a")), "s3cret", 2_000)).toBe(false);
    expect(await verifySession(t, "s3cret", 1_000 + 31 * 86_400_000)).toBe(false);
    expect(await verifySession(undefined, "s3cret")).toBe(false);
  });
});

describe("ads reporting", () => {
  it("joins spend with CRM outcomes and computes unit costs", () => {
    const rows = joinCampaigns(
      [
        { campaignId: "a", campaignName: "Grooms", spend: 600, impressions: 1, clicks: 50 },
        { campaignId: "b", campaignName: "Execs", spend: 0, impressions: 0, clicks: 0 },
      ],
      new Map([
        ["a", { name: "Grooms", leads: 12, booked: 4, ordered: 1, revenueCents: 300000 }],
        ["c", { name: "Organic test", leads: 2, booked: 0, ordered: 0, revenueCents: 0 }],
      ]),
    );
    const a = rows.find((r) => r.campaignId === "a")!;
    expect(a).toMatchObject({ costPerLead: 50, costPerBooking: 150, costPerOrder: 600, roas: 5 });
    expect(rows.find((r) => r.campaignId === "b")!.costPerLead).toBeNull();
    expect(rows.find((r) => r.campaignId === "c")!.leads).toBe(2);
  });

  it("matches Meta's date presets", () => {
    const now = new Date("2026-11-03T18:00:00Z");
    const r = presetRange("last_7d", now);
    expect(r.since.toISOString()).toBe("2026-10-27T00:00:00.000Z");
    expect(r.until.toISOString()).toBe("2026-11-03T00:00:00.000Z");
    expect(presetRange("last_month", now).since.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
});

beforeEach(() => vi.unstubAllEnvs());
