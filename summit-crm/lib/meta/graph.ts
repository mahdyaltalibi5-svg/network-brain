import { config } from "../config";

export class GraphError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
  }
}

/** Minimal Graph API client: one place for the version, the base URL and error handling. */
export async function graph<T>(
  path: string,
  { token, params = {}, method = "GET", body }: { token: string; params?: Record<string, string>; method?: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const url = path.startsWith("https://") ? new URL(path) : new URL(`https://graph.facebook.com/${config.meta.graphVersion()}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  if (!url.searchParams.has("access_token")) url.searchParams.set("access_token", token);
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    // A string body is sent as-is (already-serialised JSON, see capi.ts).
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!res.ok || json?.error) {
    throw new GraphError(json?.error?.message ?? `Graph API ${res.status}`, res.status, json);
  }
  return json as T;
}

/** Follows `paging.next` cursors, up to `maxPages`. */
export async function graphAll<T>(path: string, opts: { token: string; params?: Record<string, string> }, maxPages = 10): Promise<T[]> {
  const out: T[] = [];
  let page = await graph<{ data: T[]; paging?: { next?: string } }>(path, opts);
  out.push(...page.data);
  for (let i = 1; i < maxPages && page.paging?.next; i++) {
    page = await graph(page.paging.next, { token: opts.token });
    out.push(...page.data);
  }
  return out;
}
