import { getDb } from "../db";
import { upsertLead } from "../leads";
import { touchLead } from "../speed";
import { metaCreds } from "./creds";
import { graph } from "./graph";

/**
 * Facebook Messenger and Instagram DMs to the Summit Page become leads. The first message from
 * someone creates the lead (and the phone alert); later messages are logged on it. A reply sent
 * from the Page (Meta Business Suite, the Instagram app) stops the speed-to-lead clock.
 */
type Messaging = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: { type?: string }[] };
};
type Payload = { object?: string; entry?: { id?: string; messaging?: Messaging[] }[] };

export type DmEvent = { platform: "messenger" | "instagram_dm"; accountId: string; customerId: string; fromPage: boolean; text: string; at: Date };

/** Pulls message events out of a Page or Instagram webhook delivery. */
export function messageEvents(payload: unknown): DmEvent[] {
  const p = payload as Payload;
  if ((p?.object !== "page" && p?.object !== "instagram") || !Array.isArray(p.entry)) return [];
  const platform = p.object === "instagram" ? "instagram_dm" : "messenger";
  const out: DmEvent[] = [];
  for (const e of p.entry) {
    for (const m of e.messaging ?? []) {
      if (!m.message || !m.sender?.id || !m.recipient?.id) continue;
      const fromPage = !!m.message.is_echo || m.sender.id === e.id;
      const text = m.message.text?.trim() || (m.message.attachments?.length ? `[${m.message.attachments.map((a) => a.type ?? "attachment").join(", ")}]` : "");
      out.push({
        platform,
        accountId: String(e.id ?? (fromPage ? m.sender.id : m.recipient.id)),
        customerId: fromPage ? m.recipient.id : m.sender.id,
        fromPage,
        text: text.slice(0, 2000),
        at: m.timestamp ? new Date(m.timestamp) : new Date(),
      });
    }
  }
  return out;
}

export const dmKey = (e: Pick<DmEvent, "platform" | "customerId">) => `dm:${e.platform === "instagram_dm" ? "ig" : "fb"}:${e.customerId}`;

async function displayName(e: DmEvent, token: string) {
  try {
    if (e.platform === "instagram_dm") {
      const u = await graph<{ name?: string; username?: string }>(e.customerId, { token, params: { fields: "name,username" } });
      return u.name || (u.username ? `@${u.username}` : undefined);
    }
    const u = await graph<{ name?: string; first_name?: string; last_name?: string }>(e.customerId, { token, params: { fields: "name,first_name,last_name" } });
    return u.name || [u.first_name, u.last_name].filter(Boolean).join(" ") || undefined;
  } catch {
    return undefined; // profile access can be limited; the lead still comes in
  }
}

export async function handleMessages(events: DmEvent[]) {
  const db = await getDb();
  const { pageToken } = await metaCreds();
  const results: { key: string; lead?: string; created?: boolean }[] = [];
  for (const e of events) {
    const key = dmKey(e);
    const existing = (await db.query<{ id: string }>(`SELECT id FROM leads WHERE meta_lead_id = $1`, [key]))[0];
    if (e.fromPage) {
      // Kobe (or the Page) replied: counts as first contact for speed to lead.
      if (existing) {
        await db.query(`INSERT INTO activities (id, lead_id, kind, body) VALUES ($1, $2, 'message', $3)`, [crypto.randomUUID(), existing.id, `You: ${e.text}`]);
        const lead = (await db.query<{ first_contact_at: unknown }>(`SELECT first_contact_at FROM leads WHERE id = $1`, [existing.id]))[0];
        if (!lead.first_contact_at) await touchLead(existing.id, "message");
      }
      results.push({ key, lead: existing?.id });
      continue;
    }
    if (existing) {
      await db.query(`INSERT INTO activities (id, lead_id, kind, body) VALUES ($1, $2, 'message', $3)`, [crypto.randomUUID(), existing.id, e.text]);
      await db.query(`UPDATE leads SET updated_at = now() WHERE id = $1`, [existing.id]);
      results.push({ key, lead: existing.id, created: false });
      continue;
    }
    const name = pageToken ? await displayName(e, pageToken) : undefined;
    const { lead, created } = await upsertLead({
      source: "meta",
      metaLeadId: key,
      fullName: name,
      occasion: e.platform === "instagram_dm" ? "Instagram message" : "Facebook message",
      notes: e.text,
      platform: e.platform,
      createdAt: e.at,
    });
    if (created) await db.query(`INSERT INTO activities (id, lead_id, kind, body) VALUES ($1, $2, 'message', $3)`, [crypto.randomUUID(), lead.id, e.text]);
    results.push({ key, lead: lead.id, created });
  }
  return results;
}
