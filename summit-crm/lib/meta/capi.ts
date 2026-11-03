import { config } from "../config";
import { stage as stageOf, type StageId } from "../stages";
import { graph } from "./graph";

/**
 * Conversions API for CRM ("Conversion Leads"). Each stage change becomes one event, so
 * Meta learns which ads bring people who book and buy, not just people who fill in forms.
 * Spec: action_source=system_generated, custom_data.event_source=crm,
 * custom_data.lead_event_source=<CRM name>, user_data.lead_id=<Meta lead ID>.
 */

export type CapiLead = {
  id: string;
  metaLeadId?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  valueCents?: number | null;
  leadCreatedAt: Date;
};

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const normalizeEmail = (e: string) => e.trim().toLowerCase();
/** Digits only, with country code. A 10-digit number is treated as US/Canada (+1). */
export function normalizePhone(p: string) {
  const digits = p.replace(/\D/g, "");
  return digits.length === 10 ? `1${digits}` : digits;
}
const normalizeName = (n: string) => n.trim().toLowerCase().replace(/[^\p{L}\p{M}' -]/gu, "");

/** Placeholder swapped for the raw number after JSON.stringify: lead IDs can exceed 2^53. */
const LEAD_ID_TOKEN = "__LEAD_ID__";

export async function buildStageEvent(lead: CapiLead, stageId: StageId, at: Date = new Date()) {
  const s = stageOf(stageId);
  const user: Record<string, unknown> = {};
  if (lead.metaLeadId && /^\d+$/.test(lead.metaLeadId)) user.lead_id = LEAD_ID_TOKEN;
  if (lead.email) user.em = [await sha256(normalizeEmail(lead.email))];
  if (lead.phone && normalizePhone(lead.phone).length >= 8) user.ph = [await sha256(normalizePhone(lead.phone))];
  if (lead.fullName) {
    const [first, ...rest] = normalizeName(lead.fullName).split(/\s+/).filter(Boolean);
    if (first) user.fn = [await sha256(first)];
    if (rest.length) user.ln = [await sha256(rest[rest.length - 1])];
  }
  if (lead.fbc) user.fbc = lead.fbc;
  if (lead.fbp) user.fbp = lead.fbp;

  const custom: Record<string, unknown> = { event_source: "crm", lead_event_source: config.crmName() };
  if (stageId === "ordered" && lead.valueCents) {
    custom.value = lead.valueCents / 100;
    custom.currency = config.currency();
  }

  // Meta discards events timed before the lead was created.
  const eventTime = Math.max(Math.floor(at.getTime() / 1000), Math.floor(lead.leadCreatedAt.getTime() / 1000) + 1);
  return {
    event_name: s.metaEvent,
    event_time: eventTime,
    event_id: `${lead.id}:${stageId}`,
    action_source: "system_generated",
    user_data: user,
    custom_data: custom,
  };
}

/** Serialises the request body with lead_id as a bare JSON number, as Meta's spec shows it. */
export function serializeEvents(events: { user_data: Record<string, unknown> }[], leadIds: (string | null | undefined)[], testEventCode?: string) {
  let json = JSON.stringify({ data: events, ...(testEventCode ? { test_event_code: testEventCode } : {}) });
  for (const id of leadIds) if (id && /^\d+$/.test(id)) json = json.replace(`"${LEAD_ID_TOKEN}"`, id);
  return json;
}

export type CapiResult = { sent: boolean; skipped?: string; response?: unknown; error?: string };

export async function sendStageEvent(lead: CapiLead, stageId: StageId, at?: Date): Promise<CapiResult> {
  const pixel = config.meta.pixelId();
  const token = config.meta.capiToken();
  if (!pixel || !token) return { sent: false, skipped: "Conversions API not configured" };
  const event = await buildStageEvent(lead, stageId, at);
  if (!Object.keys(event.user_data).length) return { sent: false, skipped: "No lead ID, email or phone to match on" };
  try {
    const body = serializeEvents([event], [lead.metaLeadId], config.meta.testEventCode());
    const response = await graph(`${pixel}/events`, { token, method: "POST", body });
    return { sent: true, response };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}
