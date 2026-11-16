import { getDb } from "./db";

/**
 * Client profile: measurements, style preferences, garments ordered and files.
 * Measurements are free text per field (inches, or whatever Kobe writes), kept in one JSON column
 * so adding a field never needs a migration.
 */
export const MEASUREMENTS: { key: string; label: string; group: string }[] = [
  { key: "height", label: "Height", group: "Body" },
  { key: "weight", label: "Weight", group: "Body" },
  { key: "neck", label: "Neck", group: "Jacket & shirt" },
  { key: "chest", label: "Chest", group: "Jacket & shirt" },
  { key: "stomach", label: "Stomach", group: "Jacket & shirt" },
  { key: "jacketWaist", label: "Jacket waist", group: "Jacket & shirt" },
  { key: "shoulder", label: "Shoulder width", group: "Jacket & shirt" },
  { key: "sleeveR", label: "Sleeve (right)", group: "Jacket & shirt" },
  { key: "sleeveL", label: "Sleeve (left)", group: "Jacket & shirt" },
  { key: "bicep", label: "Bicep", group: "Jacket & shirt" },
  { key: "wrist", label: "Wrist", group: "Jacket & shirt" },
  { key: "jacketLength", label: "Jacket length", group: "Jacket & shirt" },
  { key: "backLength", label: "Back length", group: "Jacket & shirt" },
  { key: "trouserWaist", label: "Trouser waist", group: "Trousers" },
  { key: "seat", label: "Seat", group: "Trousers" },
  { key: "thigh", label: "Thigh", group: "Trousers" },
  { key: "knee", label: "Knee", group: "Trousers" },
  { key: "hem", label: "Hem / cuff", group: "Trousers" },
  { key: "rise", label: "Rise", group: "Trousers" },
  { key: "inseam", label: "Inseam", group: "Trousers" },
  { key: "outseam", label: "Outseam", group: "Trousers" },
  { key: "shoe", label: "Shoe size", group: "Other" },
  { key: "posture", label: "Posture notes", group: "Other" },
];

export const PREFERENCES: { key: string; label: string; options?: string[]; placeholder?: string }[] = [
  { key: "fit", label: "Fit", options: ["Slim", "Tailored", "Classic", "Relaxed"] },
  { key: "lapel", label: "Lapel", options: ["Notch", "Peak", "Shawl"] },
  { key: "buttons", label: "Buttons", options: ["One", "Two", "Three-roll-two", "Double-breasted"] },
  { key: "vents", label: "Vents", options: ["Side vents", "Centre vent", "No vent"] },
  { key: "trousers", label: "Trousers", options: ["Flat front", "Single pleat", "Double pleat"] },
  { key: "break", label: "Trouser break", options: ["No break", "Slight", "Half", "Full"] },
  { key: "collar", label: "Shirt collar", options: ["Spread", "Cutaway", "Point", "Button-down", "Wing"] },
  { key: "fabrics", label: "Fabrics they like", placeholder: "Super 130s worsted, flannel, linen…" },
  { key: "colours", label: "Colours", placeholder: "Navy, charcoal, mid-grey…" },
  { key: "avoid", label: "Avoid", placeholder: "Shiny finishes, wide lapels…" },
  { key: "monogram", label: "Monogram", placeholder: "J.M.R. in navy, left cuff" },
  { key: "notes", label: "Style notes", placeholder: "Wears it for court, travels weekly…" },
];

export const GARMENT_KINDS = ["Two-piece suit", "Three-piece suit", "Sport coat", "Tuxedo", "Trousers", "Waistcoat", "Shirt", "Overcoat", "Shoes", "Other"];
export const GARMENT_STATUS = [
  { id: "planned", label: "Planned" },
  { id: "ordered", label: "Ordered" },
  { id: "production", label: "In production" },
  { id: "fitting", label: "Fitting" },
  { id: "ready", label: "Ready" },
  { id: "delivered", label: "Delivered" },
] as const;
export type GarmentStatus = (typeof GARMENT_STATUS)[number]["id"];

export type Garment = { id: string; leadId: string; kind: string; fabric: string | null; details: string | null; status: GarmentStatus; priceCents: number | null; dueDate: string | null; createdAt: Date };
export type FileMeta = { id: string; leadId: string; name: string; mime: string; size: number; createdAt: Date };

const clean = (o: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, typeof o[k] === "string" ? (o[k] as string).trim().slice(0, 200) : ""]).filter(([, v]) => v));

async function log(leadId: string, body: string) {
  const db = await getDb();
  await db.query(`INSERT INTO activities (id, lead_id, kind, body) VALUES ($1, $2, 'profile', $3)`, [crypto.randomUUID(), leadId, body]);
}

export async function saveMeasurements(leadId: string, values: Record<string, unknown>) {
  const db = await getDb();
  const m = clean(values, MEASUREMENTS.map((f) => f.key));
  await db.query(`UPDATE leads SET measurements = $2, updated_at = now() WHERE id = $1`, [leadId, JSON.stringify(m)]);
  await log(leadId, `Measurements updated (${Object.keys(m).length} recorded)`);
}

export async function savePreferences(leadId: string, values: Record<string, unknown>) {
  const db = await getDb();
  const p = clean(values, PREFERENCES.map((f) => f.key));
  await db.query(`UPDATE leads SET preferences = $2, updated_at = now() WHERE id = $1`, [leadId, JSON.stringify(p)]);
  await log(leadId, "Style preferences updated");
}

export async function saveDetails(leadId: string, d: { eventDate: string | null; eventLabel: string | null; valueCents: number | null }) {
  const db = await getDb();
  await db.query(`UPDATE leads SET event_date = $2, event_label = $3, value_cents = $4, updated_at = now() WHERE id = $1`, [
    leadId,
    d.eventDate && /^\d{4}-\d{2}-\d{2}$/.test(d.eventDate) ? d.eventDate : null,
    d.eventLabel?.trim().slice(0, 60) || null,
    d.valueCents,
  ]);
  if (d.eventLabel?.trim() || d.eventDate) await log(leadId, `Event: ${[d.eventLabel?.trim(), d.eventDate].filter(Boolean).join(" · ")}`);
}

/* ── Garments ─────────────────────────────────────────────────────────────────────────────────── */
const toGarment = (r: Record<string, unknown>): Garment => ({
  id: String(r.id),
  leadId: String(r.lead_id),
  kind: String(r.kind),
  fabric: (r.fabric as string) ?? null,
  details: (r.details as string) ?? null,
  status: r.status as GarmentStatus,
  priceCents: r.price_cents == null ? null : Number(r.price_cents),
  dueDate: r.due_date == null ? null : (r.due_date instanceof Date ? r.due_date.toISOString() : String(r.due_date)).slice(0, 10),
  createdAt: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
});

export async function garments(leadId: string) {
  const db = await getDb();
  return (await db.query(`SELECT * FROM garments WHERE lead_id = $1 ORDER BY created_at`, [leadId])).map(toGarment);
}

export async function addGarment(leadId: string, g: { kind: string; fabric?: string; details?: string; priceCents?: number | null; dueDate?: string | null }) {
  const db = await getDb();
  const kind = GARMENT_KINDS.includes(g.kind) ? g.kind : "Other";
  const id = crypto.randomUUID();
  await db.query(`INSERT INTO garments (id, lead_id, kind, fabric, details, price_cents, due_date) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
    id,
    leadId,
    kind,
    g.fabric?.trim().slice(0, 120) || null,
    g.details?.trim().slice(0, 500) || null,
    g.priceCents ?? null,
    g.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(g.dueDate) ? g.dueDate : null,
  ]);
  await log(leadId, `Garment added: ${kind}${g.fabric ? ` in ${g.fabric.trim()}` : ""}`);
  return id;
}

export async function setGarmentStatus(id: string, status: string) {
  if (!GARMENT_STATUS.some((s) => s.id === status)) return;
  const db = await getDb();
  const r = (await db.query(`UPDATE garments SET status = $2 WHERE id = $1 RETURNING lead_id, kind`, [id, status]))[0];
  if (r) await log(String(r.lead_id), `${r.kind}: ${GARMENT_STATUS.find((s) => s.id === status)!.label}`);
}

export async function deleteGarment(id: string) {
  const db = await getDb();
  await db.query(`DELETE FROM garments WHERE id = $1`, [id]);
}

/* ── Files (photos, measurement sheets, invoices) ─────────────────────────────────────────────── */
export const MAX_FILE = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB request bodies
const toFile = (r: Record<string, unknown>): FileMeta => ({
  id: String(r.id),
  leadId: String(r.lead_id),
  name: String(r.name),
  mime: String(r.mime),
  size: Number(r.size),
  createdAt: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
});

export async function files(leadId: string) {
  const db = await getDb();
  return (await db.query(`SELECT id, lead_id, name, mime, size, created_at FROM files WHERE lead_id = $1 ORDER BY created_at DESC`, [leadId])).map(toFile);
}

export async function addFile(leadId: string, f: { name: string; mime: string; bytes: Uint8Array }) {
  if (f.bytes.byteLength > MAX_FILE) throw new Error("File is over 4 MB");
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.query(`INSERT INTO files (id, lead_id, name, mime, size, data) VALUES ($1, $2, $3, $4, $5, $6)`, [
    id,
    leadId,
    f.name.slice(0, 160),
    f.mime.slice(0, 100) || "application/octet-stream",
    f.bytes.byteLength,
    f.bytes,
  ]);
  await log(leadId, `File added: ${f.name}`);
  return id;
}

export async function readFile(id: string) {
  const db = await getDb();
  const r = (await db.query(`SELECT name, mime, data FROM files WHERE id = $1`, [id]))[0];
  return r ? { name: String(r.name), mime: String(r.mime), data: new Uint8Array(r.data as ArrayBuffer) } : null;
}

export async function deleteFile(id: string) {
  const db = await getDb();
  await db.query(`DELETE FROM files WHERE id = $1`, [id]);
}
