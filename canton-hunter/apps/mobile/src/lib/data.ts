/** Read helpers over the local store: config, people, find display values, media URLs. */
import { CONFIG_DEFAULTS, eff, type CostConfig, type KillRules, type ScorecardConfig, type TimingConfig } from "@canton/core";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { all, useTable, type Row } from "./store";
import { localUri } from "./upload";

export interface AppConfig {
  cost: CostConfig;
  timing: TimingConfig;
  scorecard: ScorecardConfig;
  kill_rules_default: KillRules;
  vetting_checklist: { key: string; label: string }[];
  fair_phases: { phase: number; start: string; end: string; categories: string }[];
}

export function configFrom(rows: Row[]): AppConfig {
  const out: Record<string, unknown> = {};
  for (const [k, d] of Object.entries(CONFIG_DEFAULTS)) out[k] = d.value;
  for (const r of rows) {
    const d = out[r.key];
    out[r.key] = d && typeof d === "object" && !Array.isArray(d) && typeof r.value === "object" && !Array.isArray(r.value)
      ? { ...(d as object), ...(r.value as object) } : r.value;
  }
  return out as unknown as AppConfig;
}
export const useConfig = () => configFrom(useTable("config"));
export const getConfig = () => configFrom(all("config"));

export const PERSON_COLORS = ["#F59E0B", "#34D399", "#F472B6", "#38BDF8", "#A78BFA"];
export function usePeople(): Map<string, { name: string; color: string }> {
  const profiles = useTable("profiles");
  return new Map(profiles.map((p, i) => [p.id, { name: p.name || "?", color: p.color || PERSON_COLORS[i % PERSON_COLORS.length]! }]));
}

export const findTitle = (f: Row) => eff(f.title_override, f.title_ai) ?? (f.processing_state === "error" ? "Couldn't process" : "Processing…");
export const findDescription = (f: Row) => eff(f.description_override, f.description_ai) ?? "";
export const findCategory = (f: Row) => eff(f.category_override, f.category_ai) ?? "";
export const GUT_EMOJI: Record<string, string> = { fire: "🔥", good: "👍", meh: "🤷" };

export function formatMoney(cents: number | null | undefined, currency = "USD"): string {
  if (cents == null) return "—";
  const sym = currency === "USD" ? "$" : currency === "CNY" || currency === "RMB" ? "¥" : `${currency} `;
  return `${sym}${(cents / 100).toFixed(2)}`;
}

/** Asia/Shanghai calendar date for a timestamp (the fair's "day"). */
export const fairDay = (iso: string) => new Date(Date.parse(iso) + 8 * 3600_000).toISOString().slice(0, 10);

// ---------- media URLs: local file first, else a cached signed URL ----------
const signed = new Map<string, { url: string; exp: number }>();
const waiting = new Map<string, ((u: string | null) => void)[]>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  flushTimer = null;
  const paths = [...waiting.keys()];
  if (!paths.length) return;
  const cbs = new Map(waiting);
  waiting.clear();
  const { data } = await supabase.storage.from("media").createSignedUrls(paths, 3600);
  for (const p of paths) {
    const url = data?.find((d) => d.path === p)?.signedUrl ?? null;
    if (url) signed.set(p, { url, exp: Date.now() + 3500_000 });
    cbs.get(p)?.forEach((cb) => cb(url));
  }
}

function signedUrlFor(path: string): Promise<string | null> {
  const hit = signed.get(path);
  if (hit && hit.exp > Date.now()) return Promise.resolve(hit.url);
  return new Promise((resolve) => {
    waiting.set(path, [...(waiting.get(path) ?? []), resolve]);
    flushTimer ??= setTimeout(flush, 30);
  });
}

/** Image source for a media row, stable cache key so expo-image caches across signed-URL changes. */
export function useMediaSource(media: Row | undefined): { uri: string; cacheKey: string } | null {
  const local = media ? localUri(media.id) : null;
  const [remote, setRemote] = useState<string | null>(null);
  useEffect(() => {
    if (!media || local || !media.storage_path) return;
    let alive = true;
    void signedUrlFor(media.storage_path).then((u) => { if (alive) setRemote(u); });
    return () => { alive = false; };
  }, [media?.id, media?.storage_path, local]);
  if (!media) return null;
  if (local) return { uri: local, cacheKey: media.id };
  return remote ? { uri: remote, cacheKey: media.id } : null;
}

export function mediaFor(findId: string, kind?: string): Row[] {
  return all("media").filter((m) => m.find_id === findId && (!kind || m.kind === kind));
}

export async function remoteUrl(path: string): Promise<string | null> {
  return signedUrlFor(path);
}
