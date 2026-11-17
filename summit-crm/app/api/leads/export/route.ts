import { listLeads } from "@/lib/leads";
import { isStage, stage } from "@/lib/stages";

/**
 * Downloads leads as a CSV (opens in Excel, Numbers, Google Sheets). Signed-in only (proxy.ts).
 * Uses the Pipeline's filters (?q, source, campaign, range, stage); lost leads are included.
 */
const cell = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString().slice(0, 16).replace("T", " ") : String(v);
  // quote everything; neutralise spreadsheet formulas (=, +, -, @ at the start)
  // (phone numbers like +18015550100 are left alone)
  return `"${(/^[=@\t\r]|^[+-](?![\d\s(])/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(request: Request) {
  const p = Object.fromEntries(new URL(request.url).searchParams);
  let leads = await listLeads({ q: p.q, source: p.source, campaign: p.campaign, range: p.range, sort: p.sort ?? "new" });
  if (isStage(p.stage)) leads = leads.filter((l) => l.stage === p.stage);
  const head = ["Name", "Email", "Phone", "Stage", "Lost reason", "Source", "Campaign", "Ad", "Interested in", "Event", "Event date", "Value (USD)", "First contacted", "Arrived"];
  const rows = leads.map((l) => [
    l.fullName, l.email, l.phone, stage(l.stage).label, l.lostReason,
    l.source === "meta" ? "Meta ad" : l.source === "website" ? "Website" : "Added by hand",
    l.campaignName, l.adName, l.occasion?.replace(/_/g, " "), l.eventLabel, l.eventDate,
    l.valueCents != null ? (l.valueCents / 100).toFixed(2) : "", l.firstContactAt, l.leadCreatedAt,
  ]);
  const csv = "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="summit-leads-${day}.csv"`, "Cache-Control": "no-store" },
  });
}
