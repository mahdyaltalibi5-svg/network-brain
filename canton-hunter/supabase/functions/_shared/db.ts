import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.ts";

// deno-lint-ignore no-explicit-any
export type Row = Record<string, any>;

let admin: SupabaseClient | null = null;
/** Service-role client (bypasses RLS). Only used inside Edge Functions. */
export function db(): SupabaseClient {
  admin ??= createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/** Throw on Supabase errors so jobs fail loudly and get retried. */
export function must<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

export const nowIso = () => new Date().toISOString();
