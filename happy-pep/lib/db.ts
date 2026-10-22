import "server-only";
import postgres from "postgres";

// Postgres connection. Set DATABASE_URL (e.g. a Neon database from the
// Vercel Marketplace). The orders table is created on first use.
let sql: postgres.Sql | null = null;
let ready: Promise<unknown> | null = null;

export const hasDb = () => Boolean(process.env.DATABASE_URL);

export async function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  sql ??= postgres(url, {
    max: 5,
    idle_timeout: 20,
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
    // numeric columns come back as strings by default; money fits in a double.
    types: { numeric: { to: 1700, from: [1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x) } },
  });
  ready ??= sql`
    create table if not exists orders (
      id text primary key,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      status text not null default 'pending_payment',
      email text not null,
      name text not null,
      phone text not null default '',
      address text not null,
      city text not null,
      state text not null,
      zip text not null,
      zone text not null,
      items jsonb not null,
      vials integer not null,
      subtotal numeric(10, 2) not null,
      discount numeric(10, 2) not null default 0,
      shipping numeric(10, 2) not null default 0,
      total numeric(10, 2) not null,
      source text not null default 'direct',
      campaign text not null default '',
      tracking text not null default '',
      notes text not null default '',
      paid_at timestamptz,
      shipped_at timestamptz,
      delivered_at timestamptz
    );
    create index if not exists orders_created_at_idx on orders (created_at desc);
    create index if not exists orders_status_idx on orders (status);
  `.simple();
  await ready;
  return sql;
}
