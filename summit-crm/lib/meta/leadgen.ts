import { config } from "../config";
import { graph, graphAll } from "./graph";

/** Fields requested for every Instant Form lead. */
export const LEAD_FIELDS =
  "id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,platform";

export type MetaLead = {
  id: string;
  created_time: string;
  field_data?: { name: string; values?: string[] }[];
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  platform?: string;
};

/** A lead in the shape the CRM stores, whatever its source. */
export type LeadInput = {
  source: "meta" | "website" | "manual";
  metaLeadId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  occasion?: string;
  notes?: string;
  answers?: { question: string; answer: string }[];
  campaignId?: string;
  campaignName?: string;
  adsetId?: string;
  adsetName?: string;
  adId?: string;
  adName?: string;
  formId?: string;
  platform?: string;
  fbc?: string;
  fbp?: string;
  createdAt?: Date;
};

const clean = (s?: string) => s?.trim() || undefined;
const pretty = (key: string) => key.replace(/[_?]+/g, " ").replace(/\s+/g, " ").trim().replace(/^\w/, (c) => c.toUpperCase());

/**
 * Turns Meta's `field_data` into CRM fields. Standard question keys (full_name, email,
 * phone_number…) map to columns; every answer, custom questions included, is kept in `answers`.
 */
export function fromMetaLead(lead: MetaLead): LeadInput {
  const answers: { question: string; answer: string }[] = [];
  const byKey = new Map<string, string>();
  for (const f of lead.field_data ?? []) {
    const value = (f.values ?? []).join(", ").trim();
    if (!value) continue;
    byKey.set(f.name.toLowerCase(), value);
    answers.push({ question: pretty(f.name), answer: value });
  }
  const get = (...keys: string[]) => keys.map((k) => byKey.get(k)).find(Boolean);
  const first = get("first_name");
  const last = get("last_name");
  const occasion = [...byKey.entries()].find(([k]) => /occasion|service|interest|looking_for|what_/.test(k))?.[1];
  return {
    source: "meta",
    metaLeadId: lead.id,
    fullName: clean(get("full_name", "name") ?? ([first, last].filter(Boolean).join(" ") || undefined)),
    email: clean(get("email", "work_email")),
    phone: clean(get("phone_number", "phone", "work_phone_number")),
    occasion: clean(occasion),
    answers,
    campaignId: lead.campaign_id,
    campaignName: lead.campaign_name,
    adsetId: lead.adset_id,
    adsetName: lead.adset_name,
    adId: lead.ad_id,
    adName: lead.ad_name,
    formId: lead.form_id,
    platform: lead.platform,
    createdAt: lead.created_time ? new Date(lead.created_time) : undefined,
  };
}

export function fetchLead(leadgenId: string) {
  const token = config.meta.pageToken();
  if (!token) throw new Error("META_PAGE_ACCESS_TOKEN is not set");
  return graph<MetaLead>(leadgenId, { token, params: { fields: LEAD_FIELDS } });
}

/** Every lead form on the Page, then each form's recent leads. Used by the daily sync. */
export async function fetchRecentLeads(sinceUnix: number): Promise<MetaLead[]> {
  const token = config.meta.pageToken();
  const pageId = config.meta.pageId();
  if (!token || !pageId) throw new Error("META_PAGE_ID and META_PAGE_ACCESS_TOKEN are required for sync");
  const forms = await graphAll<{ id: string }>(`${pageId}/leadgen_forms`, { token, params: { fields: "id", limit: "100" } });
  const filtering = JSON.stringify([{ field: "time_created", operator: "GREATER_THAN", value: sinceUnix }]);
  const leads: MetaLead[] = [];
  for (const form of forms) {
    leads.push(...(await graphAll<MetaLead>(`${form.id}/leads`, { token, params: { fields: LEAD_FIELDS, filtering, limit: "100" } })));
  }
  return leads;
}

/* ── Webhooks ─────────────────────────────────────────────────────────── */

export type LeadgenChange = { leadgen_id: string; page_id?: string; form_id?: string; ad_id?: string; created_time?: number };

/** The leadgen IDs in a Page webhook delivery (object: "page", field: "leadgen"). */
export function leadgenIds(payload: unknown): LeadgenChange[] {
  const p = payload as { object?: string; entry?: { changes?: { field?: string; value?: LeadgenChange }[] }[] };
  if (p?.object !== "page" || !Array.isArray(p.entry)) return [];
  return p.entry.flatMap((e) =>
    (e.changes ?? []).filter((c) => c.field === "leadgen" && c.value?.leadgen_id).map((c) => ({ ...c.value!, leadgen_id: String(c.value!.leadgen_id) })),
  );
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Checks `X-Hub-Signature-256: sha256=<hmac>` against the raw request body, in constant time. */
export async function verifySignature(rawBody: string, header: string | null, appSecret: string): Promise<boolean> {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const given = header.slice(7).toLowerCase();
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
