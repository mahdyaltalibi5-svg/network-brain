/** Sync helpers shared by the device and tests. The server applies the same rule in SQL (sync_push). */

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
