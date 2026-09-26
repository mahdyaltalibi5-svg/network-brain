/**
 * Sync model (mirrors sync_push in SQL):
 *  - Devices send PATCHES: {id, updated_at, ...only changed columns}. First insert sends the full row.
 *  - The server applies each patch's columns on arrival; server-computed columns are never client-writable.
 *  - On pull, the device takes the server row and re-applies its own still-pending patches on top.
 */

export interface Versioned {
  id: string;
  updated_at: string;
}

/** Last-write-wins: returns the row that should be kept. Ties keep `current`. */
export function lww<T extends Versioned>(current: T | undefined, incoming: T): T {
  if (!current) return incoming;
  return Date.parse(incoming.updated_at) > Date.parse(current.updated_at) ? incoming : current;
}

export const MAX_CLOCK_SKEW_MS = 24 * 3600_000;

/** Server-side guard: a client timestamp too far in the future is clamped to server time. */
export function clampClientTime(clientIso: string, serverNow: Date): string {
  const t = Date.parse(clientIso);
  if (!Number.isFinite(t) || t - serverNow.getTime() > MAX_CLOCK_SKEW_MS) return serverNow.toISOString();
  return new Date(t).toISOString();
}

/** UUID v7 (time-ordered). Requires globalThis.crypto.getRandomValues (polyfilled on React Native). */
export function uuidv7(now: number = Date.now()): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  const ts = BigInt(now);
  for (let i = 0; i < 6; i++) bytes[i] = Number((ts >> BigInt(8 * (5 - i))) & 0xffn);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const h = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Effective value of an AI field with human override. */
export function eff<T>(override: T | null | undefined, ai: T | null | undefined): T | null {
  return override ?? ai ?? null;
}

export type Patch = Record<string, unknown> & { id: string; updated_at: string };

/** Coalesce patches for the same row, in order (later columns win, updated_at = max). */
export function mergePatches(patches: Patch[]): Patch[] {
  const byId = new Map<string, Patch>();
  for (const p of patches) {
    const cur = byId.get(p.id);
    if (!cur) byId.set(p.id, { ...p });
    else byId.set(p.id, { ...cur, ...p, updated_at: cur.updated_at > p.updated_at ? cur.updated_at : p.updated_at });
  }
  return [...byId.values()];
}

/** Device-side merge on pull: server row, then pending local patches on top. */
export function applyPending<T extends Record<string, unknown>>(serverRow: T, pending: Patch[]): T {
  let row: Record<string, unknown> = { ...serverRow };
  for (const p of pending) row = { ...row, ...p };
  return row as T;
}

/** Only the columns that changed between two versions of a row (for building a patch). */
export function diffColumns(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(after)) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) out[k] = after[k];
  }
  return out;
}
