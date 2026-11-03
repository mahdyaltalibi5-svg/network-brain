import { config } from "./config";
import { schema } from "./schema";

/**
 * One tiny query interface over two engines:
 * - Postgres via `postgres` when DATABASE_URL is set (production).
 * - PGlite (Postgres compiled to WASM) otherwise: in .data/ for local dev, in memory for tests.
 * Both speak the same SQL, so every query below runs unchanged on either.
 */
export type Row = Record<string, unknown>;
export type Db = {
  query<T extends Row = Row>(text: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
};

async function postgresDb(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { max: 5, idle_timeout: 20, prepare: false });
  return {
    query: async <T extends Row>(text: string, params: unknown[] = []) =>
      (await sql.unsafe(text, params as never[])) as unknown as T[],
    close: () => sql.end(),
  };
}

export async function pgliteDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  if (dataDir) await (await import("node:fs/promises")).mkdir(dataDir, { recursive: true });
  const pg = new PGlite(dataDir);
  return {
    query: async <T extends Row>(text: string, params: unknown[] = []) => (await pg.query<T>(text, params)).rows,
    close: () => pg.close(),
  };
}

export async function migrate(db: Db) {
  for (const statement of schema) await db.query(statement);
}

const g = globalThis as unknown as { __crmDb?: Promise<Db> };

/** The shared connection, created and migrated once per server instance. */
export function getDb(): Promise<Db> {
  if (!g.__crmDb) {
    g.__crmDb = (async () => {
      const url = config.databaseUrl();
      if (!url && process.env.VERCEL) throw new Error("DATABASE_URL is not set. Add a Postgres database to the project.");
      const db = url ? await postgresDb(url) : await pgliteDb(process.env.CRM_PGLITE_DIR ?? "./.data/pglite");
      await migrate(db);
      return db;
    })().catch((e) => {
      g.__crmDb = undefined;
      throw e;
    });
  }
  return g.__crmDb;
}

/** Tests swap in their own database. */
export function setDb(db: Db | undefined) {
  g.__crmDb = db ? Promise.resolve(db) : undefined;
}
