import { fromMetaLead, type LeadInput, type MetaLead } from "./leadgen";

/**
 * Imports the lead file Meta lets you download (Ads Manager → Results → Download, or
 * Meta Business Suite → Leads Center → Export). Works while API access is pending.
 *
 * Ads Manager exports are UTF-16 and tab-separated, with prefixed IDs ("l:123", "c:456")
 * and phones ("p:+1801…"). Leads Center exports are UTF-8 CSV. Both are handled.
 */

const META_COLUMNS = new Set([
  "id", "created_time", "ad_id", "ad_name", "adset_id", "adset_name", "campaign_id", "campaign_name",
  "form_id", "form_name", "is_organic", "platform", "lead_status", "inbox_url",
]);

/** Decodes UTF-16 (with or without BOM) or UTF-8. */
export function decodeExport(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  // UTF-16LE without BOM: every other byte of ASCII text is zero
  if (bytes.length > 3 && bytes[1] === 0 && bytes[3] === 0) return new TextDecoder("utf-16le").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes).replace(/^﻿/, "");
}

/** RFC 4180 parser (quotes, escaped quotes, newlines inside quotes) for comma or tab files. */
export function parseDelimited(text: string): string[][] {
  const firstLine = text.slice(0, text.indexOf("\n") >>> 0);
  const sep = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

/** "l:1234" / "c:5678" (Ads Manager's ID prefixes) → digits. Anything else is left alone. */
const unprefix = (v: string) => v.trim().replace(/^[a-z]{1,3}:(?=\d+$)/i, "");

/** Rows → leads. Rows without a Meta lead ID are skipped (they can't be matched or de-duplicated). */
export function leadsFromExport(bytes: Uint8Array): { leads: LeadInput[]; skipped: number } {
  const [header, ...rows] = parseDelimited(decodeExport(bytes));
  if (!header) return { leads: [], skipped: 0 };
  const cols = header.map((h) => h.trim().toLowerCase());
  const leads: LeadInput[] = [];
  let skipped = 0;
  for (const r of rows) {
    const get = (name: string) => {
      const i = cols.indexOf(name);
      return i >= 0 ? unprefix(r[i] ?? "") : "";
    };
    const id = get("id");
    if (!/^\d+$/.test(id)) {
      skipped++;
      continue;
    }
    const meta: MetaLead = {
      id,
      created_time: get("created_time"),
      ad_id: get("ad_id") || undefined,
      ad_name: get("ad_name") || undefined,
      adset_id: get("adset_id") || undefined,
      adset_name: get("adset_name") || undefined,
      campaign_id: get("campaign_id") || undefined,
      campaign_name: get("campaign_name") || undefined,
      form_id: get("form_id") || undefined,
      platform: get("platform") || undefined,
      field_data: cols
        .map((name, i) => ({ name, value: (r[i] ?? "").trim().replace(/^p:(?=\+?\d)/, "") }))
        .filter((f) => f.name && !META_COLUMNS.has(f.name) && f.value)
        .map((f) => ({ name: f.name, values: [f.value] })),
    };
    const lead = fromMetaLead(meta);
    if (lead.createdAt && Number.isNaN(lead.createdAt.getTime())) lead.createdAt = undefined;
    leads.push(lead);
  }
  return { leads, skipped };
}
