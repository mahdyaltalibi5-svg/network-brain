/**
 * Placeholder helper. Anything the client must supply goes through ph() so it
 * renders as a visible "[PLACEHOLDER: …]" marker and is picked up by
 * `npm run placeholders`. Never replace a ph() with an invented fact.
 */
export const PH_RE = /\[PLACEHOLDER: ([^\]]+)\]/g;

export function ph(description: string): string {
  return `[PLACEHOLDER: ${description}]`;
}

export function isPh(value: unknown): boolean {
  return typeof value === "string" && value.includes("[PLACEHOLDER:");
}

/** Returns the value only when it's real data, so JSON-LD never publishes placeholders. */
export function real<T>(value: T): T | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return isPh(value) ? undefined : value;
  if (Array.isArray(value)) {
    const kept = value.filter((v) => !isPh(v));
    return (kept.length ? kept : undefined) as T | undefined;
  }
  return value;
}

/** Strips placeholder markers to a neutral phrase for plain-text outputs (meta descriptions). */
export function plain(text: string): string {
  return text.replace(PH_RE, "").replace(/\s{2,}/g, " ").trim();
}
