/**
 * Local-first store. SQLite on the phone is the source of truth for every screen.
 *  - rows:   one JSON document per synced row (all tables)
 *  - outbox: patches waiting to be pushed (see packages/core/src/sync.ts for the model)
 *  - files:  local media files waiting to upload
 *  - kv:     cursors, draft capture, small settings
 * All rows are also held in memory so screens render instantly; writes are synchronous transactions.
 */
import { uuidv7, type SyncedTable } from "@canton/core";
import { useSyncExternalStore } from "react";
import { memoryDb, sqlite } from "./db";

// deno-lint-ignore no-explicit-any
export type Row = Record<string, any> & { id: string };

export { sqlite };

sqlite.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS rows (tbl TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (tbl, id));
  CREATE TABLE IF NOT EXISTS outbox (
    seq INTEGER PRIMARY KEY AUTOINCREMENT, tbl TEXT NOT NULL, row_id TEXT NOT NULL, patch TEXT NOT NULL,
    created_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT);
  CREATE TABLE IF NOT EXISTS files (
    media_id TEXT PRIMARY KEY, uri TEXT NOT NULL, mime TEXT NOT NULL, kind TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'pending', resized INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT);
  CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
  CREATE VIRTUAL TABLE IF NOT EXISTS finds_fts USING fts5(id UNINDEXED, body);
`);

// ---------------- in-memory cache ----------------
const cache = new Map<string, Map<string, Row>>();
const snapshots = new Map<string, Row[]>();
const listeners = new Map<string, Set<() => void>>();

for (const r of sqlite.getAllSync<{ tbl: string; data: string }>("SELECT tbl, data FROM rows")) {
  const row = JSON.parse(r.data) as Row;
  if (!cache.has(r.tbl)) cache.set(r.tbl, new Map());
  cache.get(r.tbl)!.set(row.id, row);
}

function tableMap(t: string): Map<string, Row> {
  let m = cache.get(t);
  if (!m) cache.set(t, (m = new Map()));
  return m;
}

function emit(t: string) {
  snapshots.delete(t);
  listeners.get(t)?.forEach((l) => l());
}

/** All live (not soft-deleted) rows of a table. Stable array until the table changes. */
export function all(t: SyncedTable): Row[] {
  let s = snapshots.get(t);
  if (!s) {
    s = [...tableMap(t).values()].filter((r) => !r.deleted_at);
    snapshots.set(t, s);
  }
  return s;
}

export function get(t: SyncedTable, id: string | null | undefined): Row | undefined {
  if (!id) return undefined;
  const r = tableMap(t).get(id);
  return r && !r.deleted_at ? r : undefined;
}

export function subscribe(t: string, fn: () => void): () => void {
  if (!listeners.has(t)) listeners.set(t, new Set());
  listeners.get(t)!.add(fn);
  return () => listeners.get(t)!.delete(fn);
}

/** React hook: live rows of a table. */
export function useTable(t: SyncedTable): Row[] {
  return useSyncExternalStore((cb) => subscribe(t, cb), () => all(t));
}

export function useRow(t: SyncedTable, id: string | null | undefined): Row | undefined {
  const rows = useTable(t);
  return id ? rows.find((r) => r.id === id) : undefined;
}

// ---------------- current user ----------------
let me: string | null = null;
export const setMe = (id: string | null) => { me = id; };
export const myId = () => me;

// ---------------- writes ----------------
const now = () => new Date().toISOString();

let txDepth = 0;
/** Transaction that can be nested (inner calls join the outer transaction). */
function tx(fn: () => void) {
  if (txDepth > 0) return fn();
  txDepth++;
  try {
    sqlite.withTransactionSync(fn);
  } finally {
    txDepth--;
  }
}

function putRowSync(t: string, row: Row) {
  sqlite.runSync("INSERT OR REPLACE INTO rows (tbl, id, data) VALUES (?, ?, ?)", t, row.id, JSON.stringify(row));
  tableMap(t).set(row.id, row);
  if (t === "finds") indexFind(row);
  if (t === "suppliers") for (const f of all("finds")) if (f.supplier_id === row.id) indexFind(f);
}

/** Insert a new row (client-generated id). Queues the full row for push. */
export function insert(t: SyncedTable, values: Partial<Row>): Row {
  const ts = now();
  const row: Row = { deleted_at: null, created_by: me, ...values, id: values.id ?? uuidv7(), created_at: values.created_at ?? ts, updated_at: ts };
  tx(() => {
    putRowSync(t, row);
    sqlite.runSync("INSERT INTO outbox (tbl, row_id, patch, created_at) VALUES (?, ?, ?, ?)", t, row.id, JSON.stringify(row), ts);
  });
  emit(t);
  return row;
}

/** Change some columns of a row. Queues only those columns for push. */
export function patch(t: SyncedTable, id: string, changes: Partial<Row>): Row | undefined {
  const cur = tableMap(t).get(id);
  if (!cur) return undefined;
  const ts = now();
  const row = { ...cur, ...changes, updated_at: ts };
  tx(() => {
    putRowSync(t, row);
    sqlite.runSync("INSERT INTO outbox (tbl, row_id, patch, created_at) VALUES (?, ?, ?, ?)", t, id, JSON.stringify({ id, updated_at: ts, ...changes }), ts);
  });
  emit(t);
  return row;
}

export const softDelete = (t: SyncedTable, id: string) => patch(t, id, { deleted_at: now() });

/** Run several writes as one transaction (e.g. a capture: find + media rows + files). */
export function batch(fn: () => void) {
  tx(fn);
}

/** Apply rows that came from the server (already merged with pending local patches). */
export function applyServerRows(t: string, rows: Row[]) {
  if (!rows.length) return;
  tx(() => {
    for (const r of rows) putRowSync(t, r);
  });
  emit(t);
}

// ---------------- kv ----------------
export function kvGet<T>(k: string): T | null {
  const r = sqlite.getFirstSync<{ v: string }>("SELECT v FROM kv WHERE k = ?", k);
  return r ? (JSON.parse(r.v) as T) : null;
}
export function kvSet(k: string, v: unknown) {
  if (v === null || v === undefined) sqlite.runSync("DELETE FROM kv WHERE k = ?", k);
  else sqlite.runSync("INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)", k, JSON.stringify(v));
}

// ---------------- search ----------------
function findText(f: Row): string {
  const s = f.supplier_id ? tableMap("suppliers").get(f.supplier_id) : undefined;
  return [
    f.title_override, f.title_ai, f.description_override, f.description_ai, f.category_override, f.category_ai,
    (f.tags_ai ?? []).join(" "), f.transcript, f.hall, f.booth_code, s?.name_en, s?.name_cn, s?.contact_name,
  ].filter(Boolean).join(" ");
}

function indexFind(f: Row) {
  if (memoryDb) return;
  sqlite.runSync("DELETE FROM finds_fts WHERE id = ?", f.id);
  if (!f.deleted_at) sqlite.runSync("INSERT INTO finds_fts (id, body) VALUES (?, ?)", f.id, findText(f));
}

/** Offline full-text search over finds. Returns ids, best first. */
export function searchFinds(q: string): string[] {
  const terms = q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (!terms.length) return [];
  if (memoryDb) {
    return all("finds")
      .map((f) => { const t = findText(f).toLowerCase(); return { id: f.id, hits: terms.filter((w) => t.includes(w)).length }; })
      .filter((x) => x.hits === terms.length).map((x) => x.id);
  }
  const match = terms.map((t) => `"${t}"*`).join(" ");
  try {
    return sqlite.getAllSync<{ id: string }>("SELECT id FROM finds_fts WHERE finds_fts MATCH ? ORDER BY rank LIMIT 200", match).map((r) => r.id);
  } catch {
    return [];
  }
}

// ---------------- sign out ----------------
export function wipeLocal() {
  sqlite.execSync("DELETE FROM rows; DELETE FROM outbox; DELETE FROM kv; DELETE FROM finds_fts; DELETE FROM files;");
  for (const t of [...cache.keys()]) {
    cache.set(t, new Map());
    emit(t);
  }
}
