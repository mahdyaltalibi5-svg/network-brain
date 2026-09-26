/**
 * Sync engine: push outbox patches, pull server changes, keep going in the background.
 * Capture NEVER waits on this. Everything here is best-effort and retried.
 */
import { applyPending, mergePatches, SYNCED_TABLES, type Patch } from "@canton/core";
import NetInfo from "@react-native-community/netinfo";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { AppState } from "react-native";
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { applyServerRows, kvGet, kvSet, sqlite, type Row } from "./store";
import { runUploads, uploadStats } from "./upload";

export interface SyncStatus {
  online: boolean;
  running: boolean;
  lastSyncAt: string | null;
  pendingChanges: number;
  pendingUploads: number;
  rejected: number;
  lastError: string | null;
}

let status: SyncStatus = {
  online: true, running: false, lastSyncAt: kvGet<string>("lastSyncAt"), pendingChanges: 0, pendingUploads: 0, rejected: 0, lastError: null,
};
const statusListeners = new Set<() => void>();
function setStatus(p: Partial<SyncStatus>) {
  status = { ...status, ...p };
  statusListeners.forEach((l) => l());
}
export function refreshCounts() {
  const c = sqlite.getFirstSync<{ n: number; bad: number }>("SELECT COUNT(*) AS n, SUM(CASE WHEN attempts > 0 THEN 1 ELSE 0 END) AS bad FROM outbox");
  setStatus({ pendingChanges: c?.n ?? 0, rejected: c?.bad ?? 0, pendingUploads: uploadStats().pending });
}
export const useSyncStatus = () =>
  useSyncExternalStore((cb) => { statusListeners.add(cb); return () => statusListeners.delete(cb); }, () => status);

const TABLE_ORDER = new Map<string, number>(SYNCED_TABLES.map((t, i) => [t, i]));

interface OutboxRow { seq: number; tbl: string; row_id: string; patch: string; attempts: number }

async function pushOnce(): Promise<boolean> {
  const entries = sqlite.getAllSync<OutboxRow>("SELECT seq, tbl, row_id, patch, attempts FROM outbox ORDER BY seq LIMIT 300");
  if (!entries.length) return false;
  const maxSeq = entries[entries.length - 1]!.seq;
  // group per table, merge patches per row, parents first (finds before media, etc.)
  const byTable = new Map<string, Patch[]>();
  for (const e of entries) {
    if (!byTable.has(e.tbl)) byTable.set(e.tbl, []);
    byTable.get(e.tbl)!.push(JSON.parse(e.patch) as Patch);
  }
  const changes = [...byTable.entries()]
    .sort(([a], [b]) => (TABLE_ORDER.get(a) ?? 99) - (TABLE_ORDER.get(b) ?? 99))
    .flatMap(([table, patches]) => mergePatches(patches).map((row) => ({ table, row })));

  const { data, error } = await supabase.rpc("sync_push", { changes });
  if (error) throw new Error(`push: ${error.message}`);
  const accepted = new Set<string>((data as { accepted: string[] }).accepted);
  const rejected = (data as { rejected: { id: string; error: string }[] }).rejected;
  sqlite.withTransactionSync(() => {
    for (const e of entries) {
      if (accepted.has(e.row_id)) sqlite.runSync("DELETE FROM outbox WHERE seq = ?", e.seq);
    }
    for (const r of rejected) {
      sqlite.runSync("UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE row_id = ? AND seq <= ?", r.error, r.id, maxSeq);
    }
  });
  if (rejected.length) setStatus({ lastError: `${rejected.length} change(s) rejected: ${rejected[0]!.error}` });
  return accepted.size > 0 && entries.length === 300; // more to push
}

function pendingPatches(tbl: string, ids: string[]): Map<string, Patch[]> {
  const out = new Map<string, Patch[]>();
  if (!ids.length) return out;
  const rows = sqlite.getAllSync<{ row_id: string; patch: string }>(
    `SELECT row_id, patch FROM outbox WHERE tbl = ? AND row_id IN (${ids.map(() => "?").join(",")}) ORDER BY seq`, tbl, ...ids);
  for (const r of rows) {
    if (!out.has(r.row_id)) out.set(r.row_id, []);
    out.get(r.row_id)!.push(JSON.parse(r.patch) as Patch);
  }
  return out;
}

async function pullOnce(): Promise<void> {
  let cursors = kvGet<Record<string, string>>("cursors") ?? {};
  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabase.rpc("sync_pull", { cursors, lim: 500, overlap_seconds: page === 0 ? 10 : 0 });
    if (error) throw new Error(`pull: ${error.message}`);
    const res = data as { rows: Record<string, Row[]>; cursors: Record<string, string>; more: boolean };
    for (const [tbl, rows] of Object.entries(res.rows)) {
      const pend = pendingPatches(tbl, rows.map((r) => r.id));
      applyServerRows(tbl, rows.map((r) => applyPending(r, pend.get(r.id) ?? [])));
    }
    cursors = { ...cursors, ...res.cursors };
    kvSet("cursors", cursors);
    if (!res.more) break;
  }
}

let inflight: Promise<void> | null = null;
let again = false;

/** Push then pull. Safe to call often; concurrent calls coalesce. */
export function syncNow(): Promise<void> {
  if (inflight) {
    again = true;
    return inflight;
  }
  inflight = (async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;
    setStatus({ running: true });
    try {
      while (await pushOnce()) { /* keep pushing */ }
      await pullOnce();
      const ts = new Date().toISOString();
      kvSet("lastSyncAt", ts);
      setStatus({ lastSyncAt: ts, lastError: status.rejected ? status.lastError : null });
    } catch (e) {
      setStatus({ lastError: e instanceof Error ? e.message : String(e) });
    } finally {
      setStatus({ running: false });
      refreshCounts();
      void runUploads().then(refreshCounts);
    }
  })().finally(() => {
    inflight = null;
    if (again) {
      again = false;
      void syncNow();
    }
  });
  return inflight;
}

let debounce: ReturnType<typeof setTimeout> | null = null;
/** Coalesce bursts (e.g. many realtime events) into one sync. */
export function syncSoon(ms = 800) {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => void syncNow(), ms);
}

const BG_TASK = "canton-sync";
TaskManager.defineTask(BG_TASK, async () => {
  try {
    await syncNow();
    await runUploads();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

let started = false;
/** Start listeners once after sign-in. Returns a stop function. */
export function startSync(): () => void {
  if (started) return () => {};
  started = true;
  const unsubNet = NetInfo.addEventListener((s) => {
    const online = !!s.isConnected && s.isInternetReachable !== false;
    const wasOffline = !status.online;
    setStatus({ online });
    if (online && wasOffline) syncSoon(200);
  });
  const appSub = AppState.addEventListener("change", (s) => { if (s === "active") syncSoon(200); });
  const timer = setInterval(() => { if (status.online) void syncNow(); }, 30_000);
  const channel = supabase.channel("team")
    .on("postgres_changes", { event: "*", schema: "public", table: "finds" }, () => syncSoon())
    .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, () => syncSoon(2000))
    .on("postgres_changes", { event: "*", schema: "public", table: "research" }, () => syncSoon())
    .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => syncSoon())
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "pings" }, () => syncSoon())
    .on("postgres_changes", { event: "*", schema: "public", table: "followups" }, () => syncSoon())
    .subscribe();
  BackgroundTask.registerTaskAsync(BG_TASK, { minimumInterval: 15 }).catch(() => {});
  refreshCounts();
  void syncNow();
  return () => {
    started = false;
    unsubNet();
    appSub.remove();
    clearInterval(timer);
    void supabase.removeChannel(channel);
  };
}
