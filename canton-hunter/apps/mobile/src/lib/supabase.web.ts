/** WEB DEMO: a fake Supabase client. Calls go to lib/demo/server.ts instead of the network. */
import { DEMO_ME } from "./demo/seed";

const session = { user: { id: DEMO_ME, email: "demo@cantonhunter.app" }, access_token: "demo" };
const chain = { on: () => chain, subscribe: () => chain };

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
  },
  rpc: async (fn: string, args: Record<string, unknown> = {}) => (await import("./demo/server")).demoRpc(fn, args),
  functions: {
    invoke: async (_name: string, opts: { body: Record<string, unknown> }) => {
      try { return { data: await (await import("./demo/server")).demoApi(opts.body), error: null }; }
      catch (e) { return { data: null, error: { message: (e as Error).message } }; }
    },
  },
  storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
  channel: () => chain,
  removeChannel: async () => {},
};

export async function api<T = unknown>(body: Record<string, unknown>): Promise<T> {
  return (await import("./demo/server")).demoApi(body) as Promise<T>;
}
