import { withBase } from "./base";
import { config } from "./config";
import { getDb } from "./db";
import { getLead, type Lead } from "./leads";
import { notifyAll } from "./push";

/**
 * Speed to lead. The clock starts when the lead submitted (Meta's created_time, or arrival for
 * website/manual leads) and stops at the first contact attempt: a call, text or email from the CRM,
 * or moving the lead out of "New". Leads that arrived in the CRM long after they were submitted
 * (imported files, backfills) are left out of the averages, since nobody could have answered them.
 */
export const SLA = { good: 5, ok: 15 }; // minutes
const LATE_IMPORT_MIN = 30;

export type Channel = "call" | "text" | "email" | "message";
const verb: Record<Channel, string> = { call: "Called", text: "Texted", email: "Emailed", message: "Replied by message" };

const firstName = (l: Pick<Lead, "fullName">) => l.fullName?.trim().split(/\s+/)[0] ?? "";

/** The first message Kobe sends (text or email). Form answers like "2_suits_+_free…" stay out of it. */
export function textTemplate(l: Pick<Lead, "fullName" | "occasion">) {
  const name = firstName(l);
  return `Hi${name ? ` ${name}` : ""}, this is Kobe with Summit Custom Suits.\n\nThanks for your interest in a custom suit. When is a good time to hop on a call?`;
}
export const EMAIL_SUBJECT = "Your custom suit with Summit Custom Suits";

/** Logs a contact attempt and stops the clock if it's the first. Returns minutes taken, if it was. */
export async function touchLead(id: string, channel: Channel): Promise<number | null> {
  const db = await getDb();
  const lead = await getLead(id);
  if (!lead) throw new Error("Lead not found");
  const first = !lead.firstContactAt;
  await db.query(`UPDATE leads SET first_contact_at = COALESCE(first_contact_at, now()), updated_at = now() WHERE id = $1`, [id]);
  const mins = first ? Math.max(0, (Date.now() - lead.leadCreatedAt.getTime()) / 60000) : null;
  const to = channel === "email" ? lead.email : channel === "message" ? null : lead.phone;
  await db.query(`INSERT INTO activities (id, lead_id, kind, body, data) VALUES ($1, $2, $3, $4, $5)`, [
    crypto.randomUUID(),
    id,
    channel,
    `${verb[channel]}${to ? ` ${to}` : ""}${mins != null ? ` · first response in ${formatMinutes(mins)}` : ""}`,
    JSON.stringify({ channel, first }),
  ]);
  return mins;
}

export function formatMinutes(m: number) {
  if (m < 1) return `${Math.max(1, Math.round(m * 60))}s`;
  if (m < 60) return `${Math.round(m)} min`;
  if (m < 60 * 24) return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`;
}

/** Leads nobody has reached yet, oldest first. */
export async function waitingLeads(): Promise<Lead[]> {
  const db = await getDb();
  const rows = await db.query(`SELECT id FROM leads WHERE first_contact_at IS NULL AND stage = 'new' ORDER BY lead_created_at DESC LIMIT 100`);
  return (await Promise.all(rows.map((r) => getLead(String(r.id))))).filter(Boolean) as Lead[];
}

export type SpeedStats = { responded: number; medianMin: number | null; within5: number | null; within15: number | null; waiting: number };

export async function speedStats(days = 30): Promise<SpeedStats> {
  const db = await getDb();
  const rows = await db.query<{ m: number }>(
    `SELECT EXTRACT(EPOCH FROM (first_contact_at - lead_created_at)) / 60 AS m FROM leads
     WHERE first_contact_at IS NOT NULL AND lead_created_at > now() - ($1 || ' days')::interval
       AND created_at - lead_created_at < ($2 || ' minutes')::interval
     ORDER BY m`,
    [String(days), String(LATE_IMPORT_MIN)],
  );
  const ms = rows.map((r) => Math.max(0, Number(r.m)));
  const waiting = Number((await db.query(`SELECT count(*)::int AS n FROM leads WHERE first_contact_at IS NULL AND stage = 'new'`))[0].n);
  const pct = (lim: number) => (ms.length ? Math.round((ms.filter((m) => m <= lim).length / ms.length) * 100) : null);
  const median = ms.length ? (ms.length % 2 ? ms[(ms.length - 1) / 2] : (ms[ms.length / 2 - 1] + ms[ms.length / 2]) / 2) : null;
  return { responded: ms.length, medianMin: median, within5: pct(SLA.good), within15: pct(SLA.ok), waiting };
}

/**
 * Reminder alerts for leads still waiting: one at each threshold (default 5, 15 and 60 minutes).
 * Called every few minutes by a scheduler; each lead gets each reminder at most once.
 */
export async function sendNudges(now = new Date()) {
  const db = await getDb();
  const steps = config.nudgeMinutes();
  const rows = await db.query<{ id: string; full_name: string | null; occasion: string | null; nudges: number; age: number }>(
    `SELECT id, full_name, occasion, nudges, EXTRACT(EPOCH FROM ($1::timestamptz - lead_created_at)) / 60 AS age
     FROM leads WHERE first_contact_at IS NULL AND stage = 'new' AND nudges < $2
       AND created_at - lead_created_at < ($3 || ' minutes')::interval
       AND lead_created_at > $1::timestamptz - interval '2 days'`,
    [now.toISOString(), steps.length, String(LATE_IMPORT_MIN)],
  );
  let sent = 0;
  for (const r of rows) {
    const due = steps.filter((m) => Number(r.age) >= m).length; // reminders that should have gone out by now
    if (due <= r.nudges) continue;
    await db.query(`UPDATE leads SET nudges = $2 WHERE id = $1`, [r.id, due]);
    await notifyAll({
      title: `Still waiting · ${formatMinutes(Number(r.age))}`,
      body: `${r.full_name ?? "A new lead"}${r.occasion ? ` · ${r.occasion}` : ""} hasn't heard from you yet.`,
      url: withBase(`/leads/${r.id}`),
      tag: `lead-${r.id}`,
    });
    sent++;
  }
  return { checked: rows.length, sent };
}
