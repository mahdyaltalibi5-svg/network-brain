import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("web-push", () => ({ sendNotification: async () => {} }));

import { migrate, pgliteDb, setDb, type Db } from "@/lib/db";
import { activities, getLead, listLeads, markLost, moveLead, upsertLead } from "@/lib/leads";
import { waitingLeads } from "@/lib/speed";
import { GET as exportCsv } from "@/app/api/leads/export/route";

let db: Db;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
beforeEach(async () => {
  db = await pgliteDb();
  await migrate(db);
  setDb(db);
  vi.stubEnv("META_CAPI_TOKEN", "");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  setDb(undefined);
  await db.close();
});

describe("lost leads, export and order", () => {
  it("marks a lead lost with a reason, keeps everything, and reopening clears the reason", async () => {
    const { lead } = await upsertLead({ source: "meta", metaLeadId: "700", fullName: "Tommy Sims", email: "tommy@example.com" });
    await markLost(lead.id, "Price", "Too much for now");
    let l = (await getLead(lead.id))!;
    expect(l).toMatchObject({ stage: "lost", lostReason: "Price", email: "tommy@example.com" });
    expect((await activities(lead.id)).map((a) => a.body)).toContain("Marked lost: Price · Too much for now");
    expect((await waitingLeads()).map((x) => x.id)).not.toContain(lead.id);
    await moveLead(lead.id, "contacted");
    l = (await getLead(lead.id))!;
    expect(l).toMatchObject({ stage: "contacted", lostReason: null });
  });

  it("lists newest leads first by default, and on Today", async () => {
    await upsertLead({ source: "website", fullName: "Older", createdAt: hoursAgo(5) });
    await upsertLead({ source: "website", fullName: "Newest", createdAt: hoursAgo(1) });
    await upsertLead({ source: "website", fullName: "Middle", createdAt: hoursAgo(3) });
    expect((await listLeads()).map((l) => l.fullName)).toEqual(["Newest", "Middle", "Older"]);
    expect((await waitingLeads()).map((l) => l.fullName)).toEqual(["Newest", "Middle", "Older"]);
  });

  it("exports a CSV that spreadsheets open safely, including lost leads", async () => {
    const { lead } = await upsertLead({ source: "meta", metaLeadId: "701", fullName: "Ann \"Q\" Lee", email: "ann@example.com", phone: "+18015550100", occasion: "2_suits_+_free_custom_sport_coat", campaignName: "Black Friday" });
    await markLost(lead.id, "No response");
    await upsertLead({ source: "website", fullName: "=HYPERLINK(\"x\")" });
    const res = await exportCsv(new Request("http://x/api/leads/export"));
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="summit-leads-\d{4}-\d{2}-\d{2}\.csv"/);
    const text = await res.text();
    const lines = text.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('"Name","Email","Phone","Stage","Lost reason","Source","Campaign","Ad","Interested in","Event","Event date","Value (USD)","First contacted","Arrived"');
    const ann = lines.find((l) => l.includes("ann@example.com"))!;
    expect(ann).toContain('"Ann ""Q"" Lee","ann@example.com","+18015550100","Lost","No response","Meta ad","Black Friday"');
    expect(ann).toContain('"2 suits + free custom sport coat"');
    expect(text).toContain('"\'=HYPERLINK(""x"")"'); // formulas neutralised
  });

  it("retires DM leads as lost (kept, not deleted)", async () => {
    await upsertLead({ source: "meta", metaLeadId: "dm:ig:123", fullName: "DM Person", platform: "instagram_dm" });
    await migrate(db);
    const l = (await listLeads()).find((x) => x.fullName === "DM Person")!;
    expect(l).toMatchObject({ stage: "lost", lostReason: "Instagram/Facebook message (DM leads turned off)" });
  });
});
