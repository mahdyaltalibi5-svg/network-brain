import { site } from "./site";

export type ZipZone = "sameday" | "utah" | "usa" | "excluded";

// Approximate: Utah ZIPs start 840–847; AK 995–999, HI 967–968, PR/VI 006–009.
export function zoneFor(zip: string): ZipZone | null {
  if (!/^\d{5}$/.test(zip)) return null;
  const p3 = zip.slice(0, 3);
  const n = +p3;
  if ((n >= 995 && n <= 999) || n === 967 || n === 968 || (n >= 6 && n <= 9)) return "excluded";
  if (site.sameDayZipPrefixes.includes(p3)) return "sameday";
  if (n >= 840 && n <= 847) return "utah";
  return "usa";
}

// Shared, persisted ZIP so the checker, product pages and cart agree.
const KEY = "hp_zip";
const listeners = new Set<() => void>();

export function getZip() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setZip(zip: string) {
  try {
    localStorage.setItem(KEY, zip);
  } catch {}
  listeners.forEach((l) => l());
}

export function subscribeZip(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
