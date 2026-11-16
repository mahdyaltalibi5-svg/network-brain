import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushes: { body: { title: string; url: string } }[] = [];
vi.mock("web-push", () => ({
  sendNotification: async (_sub: unknown, body: string) => {
    pushes.push({ body: JSON.parse(body) });
  },
}));

import { migrate, pgliteDb, setDb, type Db } from "@/lib/db";
import { kpis, leadsByDay, stageSummary, upcomingEvents } from "@/lib/dashboard";
import { completeFollowUp, dueFollowUps, sendFollowUpReminders, setFollowUp, upcomingFollowUps } from "@/lib/followups";
import { activities, getLead, listLeads, moveLead, upsertLead } from "@/lib/leads";
import { addFile, addGarment, deleteFile, files, garments, readFile, saveDetails, saveMeasurements, savePreferences, setGarmentStatus } from "@/lib/profile";
import { saveSubscription } from "@/lib/push";

let db: Db;
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000);

beforeEach(async () => {
  db = await pgliteDb();
  await migrate(db);
  setDb(db);
  pushes.length = 0;
  vi.stubEnv("VAPID_PUBLIC_KEY", "pub");
  vi.stubEnv("VAPID_PRIVATE_KEY", "priv");
  vi.stubEnv("META_CAPI_TOKEN", "");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  setDb(undefined);
  await db.close();
});

describe("follow-ups", () => {
  it("lists due and upcoming follow-ups, reminds once, and clears on done", async () => {
    const { lead: a } = await upsertLead({ source: "manual", fullName: "Due Dana" });
    const { lead: b } = await upsertLead({ source: "manual", fullName: "Later Lee" });
    await setFollowUp(a.id, hoursFromNow(-1), "Send fabric swatches");
    await setFollowUp(b.id, hoursFromNow(24 * 3), "Check in");

    expect((await dueFollowUps()).map((l) => l.id)).toEqual([a.id]);
    expect((await upcomingFollowUps(7)).map((l) => l.id)).toContain(b.id);
    expect((await getLead(a.id))!.followUpNote).toBe("Send fabric swatches");

    await saveSubscription({ endpoint: "https://push.example/1", keys: { p256dh: "k", auth: "a" } });
    expect((await sendFollowUpReminders()).sent).toBe(1);
    expect(pushes[0].body.url).toBe(`/portal/leads/${a.id}`);
    expect((await sendFollowUpReminders()).sent).toBe(0); // only once

    await completeFollowUp(a.id);
    expect((await getLead(a.id))!.followUpAt).toBeNull();
    expect((await dueFollowUps()).length).toBe(0);
    expect((await activities(a.id)).some((x) => x.kind === "followup")).toBe(true);
  });
});

describe("client profile", () => {
  it("saves measurements, style, event details, garments and files", async () => {
    const { lead } = await upsertLead({ source: "website", fullName: "Sam Cole" });
    await saveMeasurements(lead.id, { chest: "40.5", seat: "34", bogus: "x", neck: "" });
    await savePreferences(lead.id, { lapel: "Peak", notes: "No pleats" });
    await saveDetails(lead.id, { eventDate: "2027-06-14", eventLabel: "Wedding", valueCents: 285000 });

    const l = (await getLead(lead.id))!;
    expect(l.measurements).toEqual({ chest: "40.5", seat: "34" });
    expect(l.preferences.notes).toBe("No pleats");
    expect(l.eventDate).toBe("2027-06-14");
    expect(l.eventLabel).toBe("Wedding");
    expect(l.valueCents).toBe(285000);

    const g = await addGarment(lead.id, { kind: "Two-piece suit", fabric: "Navy wool", priceCents: 185000, dueDate: "2027-05-30" });
    await setGarmentStatus(g, "fitting");
    await setGarmentStatus(g, "nonsense"); // ignored
    const gs = await garments(lead.id);
    expect(gs).toHaveLength(1);
    expect(gs[0].status).toBe("fitting");
    expect(gs[0].dueDate).toBe("2027-05-30");

    const bytes = new TextEncoder().encode("%PDF-1.4 test");
    const f = await addFile(lead.id, { name: "sheet.pdf", mime: "application/pdf", bytes });
    expect((await files(lead.id))[0].size).toBe(bytes.length);
    const back = await readFile(f);
    expect(new TextDecoder().decode(back!.data)).toBe("%PDF-1.4 test");
    await deleteFile(f);
    expect(await files(lead.id)).toHaveLength(0);
  });
});

describe("pipeline filters", () => {
  it("searches, filters by source and range, and sorts by value", async () => {
    await upsertLead({ source: "meta", metaLeadId: "9001", fullName: "Riley Meta", campaignName: "Wedding Season" });
    const { lead: w } = await upsertLead({ source: "website", fullName: "Wes Site", occasion: "Tuxedo" });
    await upsertLead({ source: "manual", fullName: "Old Owen", createdAt: new Date(Date.now() - 40 * 86_400_000) });
    await saveDetails(w.id, { eventDate: null, eventLabel: null, valueCents: 400000 });

    expect((await listLeads({ q: "tux" })).map((l) => l.fullName)).toEqual(["Wes Site"]);
    expect((await listLeads({ source: "meta" })).map((l) => l.fullName)).toEqual(["Riley Meta"]);
    expect((await listLeads({ campaign: "Wedding Season" }))).toHaveLength(1);
    expect((await listLeads({ range: "30" })).map((l) => l.fullName)).not.toContain("Old Owen");
    expect((await listLeads({ sort: "value" }))[0].fullName).toBe("Wes Site");
    expect(await listLeads({ sort: "'; DROP TABLE leads; --" })).toHaveLength(3);
  });
});

describe("dashboard", () => {
  it("counts leads per day by source and summarises the pipeline", async () => {
    await upsertLead({ source: "meta", metaLeadId: "1", fullName: "A" });
    await upsertLead({ source: "website", fullName: "B" });
    const { lead: c } = await upsertLead({ source: "website", fullName: "C" });
    await moveLead(c.id, "ordered", { valueCents: 250000 });
    await saveDetails(c.id, { eventDate: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10), eventLabel: "Gala", valueCents: 250000 });

    const days = await leadsByDay(30);
    expect(days).toHaveLength(30);
    const today = days[days.length - 1];
    expect(today.meta + today.website + today.manual).toBe(3);
    expect(today.website).toBe(2);

    const k = await kpis();
    expect(k.leads7).toBe(3);
    expect(k.orders30).toBe(1);
    expect(k.revenue30).toBe(250000);

    const stages = await stageSummary();
    expect(stages.find((s) => s.stage === "ordered")!.count).toBe(1);

    const ev = await upcomingEvents(90);
    expect(ev[0].label).toBe("Gala");
    expect(ev[0].days).toBeGreaterThanOrEqual(9);
  });
});
