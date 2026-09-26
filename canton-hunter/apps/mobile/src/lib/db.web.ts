/**
 * WEB DEMO ONLY. A tiny stand-in for expo-sqlite that supports exactly the statements store.ts uses for rows
 * and kv, persisted in the browser's localStorage. Everything else (outbox, files, FTS) is a no-op because the
 * web demo never syncs. Search falls back to in-memory matching (see store.searchFinds).
 */
type Rows = Record<string, Record<string, string>>;
const KEY = "canton-demo-db-v1";

function load(): { rows: Rows; kv: Record<string, string> } {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { rows: {}, kv: {} };
}
const state = load();
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { globalThis.localStorage?.setItem(KEY, JSON.stringify(state)); } catch {}
  }, 300);
}

export const sqlite = {
  execSync(sql: string) {
    if (/DELETE FROM rows/i.test(sql)) { state.rows = {}; state.kv = {}; save(); }
  },
  runSync(sql: string, ...args: unknown[]) {
    if (/INSERT OR REPLACE INTO rows/i.test(sql)) {
      const [tbl, id, data] = args as [string, string, string];
      (state.rows[tbl] ??= {})[id] = data;
      save();
    } else if (/INSERT OR REPLACE INTO kv/i.test(sql)) {
      state.kv[args[0] as string] = args[1] as string; save();
    } else if (/DELETE FROM kv/i.test(sql)) {
      delete state.kv[args[0] as string]; save();
    }
    return { changes: 0, lastInsertRowId: 0 };
  },
  getAllSync<T>(sql: string): T[] {
    if (/SELECT tbl, data FROM rows/i.test(sql)) {
      return Object.entries(state.rows).flatMap(([tbl, m]) => Object.values(m).map((data) => ({ tbl, data }))) as T[];
    }
    return [];
  },
  getFirstSync<T>(sql: string, ...args: unknown[]): T | null {
    if (/FROM kv/i.test(sql)) {
      const v = state.kv[args[0] as string];
      return (v === undefined ? null : { v }) as T | null;
    }
    if (/COUNT\(\*\)/i.test(sql) || /SUM\(/i.test(sql)) return { n: 0, bad: 0, p: 0, f: 0 } as T;
    return null;
  },
  withTransactionSync(fn: () => void) { fn(); },
};

export const memoryDb = true;

export function resetDemoDb() {
  state.rows = {}; state.kv = {};
  try { globalThis.localStorage?.removeItem(KEY); } catch {}
}
