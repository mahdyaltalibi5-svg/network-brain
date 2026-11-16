import { withBase } from "./base";
import { getDb } from "./db";
import { getLead, type Lead } from "./leads";
import { notifyAll } from "./push";

/**
 * Follow-ups: one "next step" per lead (when, and what). Due ones show on Today and send a phone
 * reminder once when they fall due (from the same scheduler as speed-to-lead reminders).
 */
const fmt = (d: Date) =>
  d.toLocaleString("en-US", { timeZone: "America/Denver", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

async function log(leadId: string, body: string) {
  const db = await getDb();
  await db.query(`INSERT INTO activities (id, lead_id, kind, body) VALUES ($1, $2, 'followup', $3)`, [crypto.randomUUID(), leadId, body]);
}

export async function setFollowUp(id: string, at: Date, note: string) {
  const db = await getDb();
  const n = note.trim().slice(0, 300) || null;
  await db.query(`UPDATE leads SET follow_up_at = $2, follow_up_note = $3, follow_up_notified = false, updated_at = now() WHERE id = $1`, [id, at.toISOString(), n]);
  await log(id, `Follow-up set for ${fmt(at)}${n ? `: ${n}` : ""}`);
}

export async function completeFollowUp(id: string) {
  const db = await getDb();
  const lead = await getLead(id);
  if (!lead?.followUpAt) return;
  await db.query(`UPDATE leads SET follow_up_at = NULL, follow_up_note = NULL, follow_up_notified = false, updated_at = now() WHERE id = $1`, [id]);
  await log(id, `Follow-up done${lead.followUpNote ? `: ${lead.followUpNote}` : ""}`);
}

const byIds = async (rows: { id: unknown }[]) => (await Promise.all(rows.map((r) => getLead(String(r.id))))).filter(Boolean) as Lead[];

/** Follow-ups due by the end of today (Mountain Time), overdue first. */
export async function dueFollowUps(): Promise<Lead[]> {
  const db = await getDb();
  return byIds(
    await db.query(
      `SELECT id FROM leads WHERE follow_up_at IS NOT NULL
         AND follow_up_at < ((now() AT TIME ZONE 'America/Denver')::date + 1)::timestamp AT TIME ZONE 'America/Denver'
       ORDER BY follow_up_at ASC LIMIT 100`,
    ),
  );
}

/** Follow-ups after today, within the next `days` days. */
export async function upcomingFollowUps(days = 7): Promise<Lead[]> {
  const db = await getDb();
  return byIds(
    await db.query(
      `SELECT id FROM leads WHERE follow_up_at IS NOT NULL
         AND follow_up_at >= ((now() AT TIME ZONE 'America/Denver')::date + 1)::timestamp AT TIME ZONE 'America/Denver'
         AND follow_up_at < now() + ($1 || ' days')::interval
       ORDER BY follow_up_at ASC LIMIT 100`,
      [String(days)],
    ),
  );
}

/** One phone reminder per follow-up when it falls due. */
export async function sendFollowUpReminders() {
  const db = await getDb();
  const rows = await db.query<{ id: string; full_name: string | null; follow_up_note: string | null }>(
    `UPDATE leads SET follow_up_notified = true
     WHERE follow_up_at IS NOT NULL AND follow_up_at <= now() AND follow_up_notified = false
     RETURNING id, full_name, follow_up_note`,
  );
  for (const r of rows) {
    await notifyAll({
      title: `Follow up · ${r.full_name ?? "a client"}`,
      body: r.follow_up_note ?? "Your follow-up is due.",
      url: withBase(`/leads/${r.id}`),
      tag: `fu-${r.id}`,
    });
  }
  return { sent: rows.length };
}
