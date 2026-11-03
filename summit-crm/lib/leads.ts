import { getDb } from "./db";
import type { LeadInput } from "./meta/leadgen";
import { sendStageEvent, type CapiResult } from "./meta/capi";
import { bookedStages, orderedStages, stage as stageOf, type StageId } from "./stages";
import type { FunnelCounts } from "./meta/insights";

export type Lead = {
  id: string;
  source: "meta" | "website" | "manual";
  metaLeadId: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  occasion: string | null;
  notes: string | null;
  answers: { question: string; answer: string }[];
  stage: StageId;
  valueCents: number | null;
  bookedAt: Date | null;
  orderedAt: Date | null;
  campaignId: string | null;
  campaignName: string | null;
  adsetName: string | null;
  adName: string | null;
  formId: string | null;
  platform: string | null;
  fbc: string | null;
  fbp: string | null;
  leadCreatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type Activity = { id: string; leadId: string; kind: string; body: string; data: unknown; createdAt: Date };

type LeadRow = Record<string, unknown>;
const date = (v: unknown) => (v == null ? null : v instanceof Date ? v : new Date(String(v)));
const json = <T>(v: unknown, fallback: T): T => (v == null ? fallback : typeof v === "string" ? (JSON.parse(v) as T) : (v as T));

function toLead(r: LeadRow): Lead {
  return {
    id: String(r.id),
    source: r.source as Lead["source"],
    metaLeadId: (r.meta_lead_id as string) ?? null,
    fullName: (r.full_name as string) ?? null,
    email: (r.email as string) ?? null,
    phone: (r.phone as string) ?? null,
    occasion: (r.occasion as string) ?? null,
    notes: (r.notes as string) ?? null,
    answers: json(r.answers, []),
    stage: r.stage as StageId,
    valueCents: r.value_cents == null ? null : Number(r.value_cents),
    bookedAt: date(r.booked_at),
    orderedAt: date(r.ordered_at),
    campaignId: (r.campaign_id as string) ?? null,
    campaignName: (r.campaign_name as string) ?? null,
    adsetName: (r.adset_name as string) ?? null,
    adName: (r.ad_name as string) ?? null,
    formId: (r.form_id as string) ?? null,
    platform: (r.platform as string) ?? null,
    fbc: (r.fbc as string) ?? null,
    fbp: (r.fbp as string) ?? null,
    leadCreatedAt: date(r.lead_created_at)!,
    createdAt: date(r.created_at)!,
    updatedAt: date(r.updated_at)!,
  };
}

const newId = () => crypto.randomUUID();

async function log(leadId: string, kind: string, body: string, data?: unknown) {
  const db = await getDb();
  await db.query(`INSERT INTO activities (id, lead_id, kind, body, data) VALUES ($1, $2, $3, $4, $5)`, [
    newId(),
    leadId,
    kind,
    body,
    data === undefined ? null : JSON.stringify(data),
  ]);
}

function capiNote(result: CapiResult, eventName: string) {
  if (result.sent) return { body: `Sent “${eventName}” to Meta`, data: result.response };
  if (result.skipped) return { body: `“${eventName}” not sent to Meta: ${result.skipped}`, data: null };
  return { body: `Meta rejected “${eventName}”: ${result.error}`, data: null };
}

/**
 * Creates a lead, or returns the existing one for the same Meta lead ID (webhooks and the
 * daily sync can both deliver the same lead). New leads send the "Lead" event to Meta.
 */
export async function upsertLead(input: LeadInput): Promise<{ lead: Lead; created: boolean }> {
  const db = await getDb();
  if (input.metaLeadId) {
    const existing = await db.query(`SELECT * FROM leads WHERE meta_lead_id = $1`, [input.metaLeadId]);
    if (existing[0]) return { lead: toLead(existing[0]), created: false };
  }
  const id = newId();
  const rows = await db.query(
    `INSERT INTO leads (id, source, meta_lead_id, full_name, email, phone, occasion, notes, answers,
       campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name, form_id, platform, fbc, fbp, lead_created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,COALESCE($20::timestamptz, now()))
     ON CONFLICT (meta_lead_id) DO NOTHING
     RETURNING *`,
    [
      id,
      input.source,
      input.metaLeadId ?? null,
      input.fullName ?? null,
      input.email?.toLowerCase() ?? null,
      input.phone ?? null,
      input.occasion ?? null,
      input.notes ?? null,
      JSON.stringify(input.answers ?? []),
      input.campaignId ?? null,
      input.campaignName ?? null,
      input.adsetId ?? null,
      input.adsetName ?? null,
      input.adId ?? null,
      input.adName ?? null,
      input.formId ?? null,
      input.platform ?? null,
      input.fbc ?? null,
      input.fbp ?? null,
      input.createdAt?.toISOString() ?? null,
    ],
  );
  if (!rows[0]) {
    // Lost a race with a concurrent delivery of the same lead.
    const again = await db.query(`SELECT * FROM leads WHERE meta_lead_id = $1`, [input.metaLeadId]);
    return { lead: toLead(again[0]), created: false };
  }
  const lead = toLead(rows[0]);
  const from = { meta: "Meta Lead Ad", website: "the website", manual: "manual entry" }[lead.source];
  await log(lead.id, "created", `Lead from ${from}${lead.campaignName ? ` (${lead.campaignName})` : ""}`);
  // Website enquiries already fire "Lead" from the Meta Pixel on the booking page; sending it
  // again from here would count each one twice. Their later stages are still reported.
  const result: CapiResult =
    lead.source === "website" ? { sent: false, skipped: "already reported by the website's Meta Pixel" } : await sendStageEvent(lead, "new");
  const note = capiNote(result, stageOf("new").metaEvent);
  await log(lead.id, "capi", note.body, note.data);
  return { lead, created: true };
}

export async function getLead(id: string) {
  const db = await getDb();
  const rows = await db.query(`SELECT * FROM leads WHERE id = $1`, [id]);
  return rows[0] ? toLead(rows[0]) : null;
}

export async function listLeads(opts: { q?: string } = {}) {
  const db = await getDb();
  const q = opts.q?.trim();
  const rows = q
    ? await db.query(
        `SELECT * FROM leads WHERE full_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR campaign_name ILIKE $1
         ORDER BY updated_at DESC LIMIT 500`,
        [`%${q}%`],
      )
    : await db.query(`SELECT * FROM leads ORDER BY updated_at DESC LIMIT 500`);
  return rows.map(toLead);
}

export async function activities(leadId: string): Promise<Activity[]> {
  const db = await getDb();
  const rows = await db.query(`SELECT * FROM activities WHERE lead_id = $1 ORDER BY created_at DESC, id`, [leadId]);
  return rows.map((r) => ({
    id: String(r.id),
    leadId: String(r.lead_id),
    kind: String(r.kind),
    body: String(r.body),
    data: json(r.data, null),
    createdAt: date(r.created_at)!,
  }));
}

/** Moves a lead to a new stage, records it, and reports the stage to Meta. */
export async function moveLead(id: string, to: StageId, opts: { valueCents?: number | null } = {}) {
  const db = await getDb();
  const current = await getLead(id);
  if (!current) throw new Error("Lead not found");
  const value = opts.valueCents ?? current.valueCents;
  if (current.stage === to && value === current.valueCents) return current;
  const rows = await db.query(
    `UPDATE leads SET stage = $2, value_cents = $3, updated_at = now(),
       booked_at = CASE WHEN $4::boolean AND booked_at IS NULL THEN now() ELSE booked_at END,
       ordered_at = CASE WHEN $5::boolean AND ordered_at IS NULL THEN now() ELSE ordered_at END
     WHERE id = $1 RETURNING *`,
    [id, to, value, bookedStages.includes(to), orderedStages.includes(to)],
  );
  const lead = toLead(rows[0]);
  if (current.stage !== to) {
    await log(id, "stage", `${stageOf(current.stage).label} → ${stageOf(to).label}`, { from: current.stage, to });
  }
  if (value !== current.valueCents && value != null) {
    await log(id, "value", `Order value set to ${(value / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}`);
  }
  if (current.stage !== to || to === "ordered") {
    const result = await sendStageEvent(lead, to);
    const note = capiNote(result, stageOf(to).metaEvent);
    await log(id, "capi", note.body, note.data);
  }
  return lead;
}

export async function addNote(id: string, body: string) {
  const text = body.trim();
  if (!text) return;
  const db = await getDb();
  await log(id, "note", text);
  await db.query(`UPDATE leads SET updated_at = now() WHERE id = $1`, [id]);
}

export async function updateContact(id: string, fields: { fullName?: string; email?: string; phone?: string; occasion?: string }) {
  const db = await getDb();
  await db.query(
    `UPDATE leads SET full_name = $2, email = $3, phone = $4, occasion = $5, updated_at = now() WHERE id = $1`,
    [id, fields.fullName?.trim() || null, fields.email?.trim().toLowerCase() || null, fields.phone?.trim() || null, fields.occasion?.trim() || null],
  );
}

/** Leads, bookings, orders and revenue per Meta campaign for leads created in [since, until). */
export async function funnelByCampaign(since: Date, until: Date) {
  const db = await getDb();
  const rows = await db.query(
    `SELECT campaign_id, MAX(campaign_name) AS name, COUNT(*)::int AS leads,
            COUNT(booked_at)::int AS booked, COUNT(ordered_at)::int AS ordered,
            COALESCE(SUM(CASE WHEN ordered_at IS NOT NULL THEN value_cents END), 0)::bigint AS revenue
     FROM leads
     WHERE campaign_id IS NOT NULL AND lead_created_at >= $1 AND lead_created_at < $2
     GROUP BY campaign_id`,
    [since.toISOString(), until.toISOString()],
  );
  return new Map<string, FunnelCounts & { name: string | null }>(
    rows.map((r) => [
      String(r.campaign_id),
      {
        name: (r.name as string) ?? null,
        leads: Number(r.leads),
        booked: Number(r.booked),
        ordered: Number(r.ordered),
        revenueCents: Number(r.revenue),
      },
    ]),
  );
}

export async function stageCounts() {
  const db = await getDb();
  const rows = await db.query(`SELECT stage, COUNT(*)::int AS n FROM leads GROUP BY stage`);
  return new Map(rows.map((r) => [r.stage as StageId, Number(r.n)]));
}
